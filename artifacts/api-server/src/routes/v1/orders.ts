import { Router, type Response } from "express";
import { Order } from "../../models/Order.js";
import { Coupon } from "../../models/Coupon.js";
import { Shop } from "../../models/Shop.js";
import { User } from "../../models/User.js";
import { Product } from "../../models/Product.js";
import { Payout } from "../../models/Payout.js";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { resolveCommission, calculateCommissionAmount } from "../../utils/commission.js";
import { createNotificationLimited } from "../../utils/notification.js";

const router = Router();
const A = requireRole("admin", "super_admin");

const STATUS_MESSAGES: Record<string, { title: string; message: string }> = {
  placed:           { title: "Order Placed", message: "Your order has been placed successfully!" },
  confirmed:        { title: "Order Confirmed", message: "Your order has been confirmed by the shop." },
  packed:           { title: "Order Packed", message: "Your order is packed and ready for pickup." },
  out_for_delivery: { title: "Out for Delivery", message: "Your order is on the way! 🚚" },
  delivered:        { title: "Order Delivered", message: "Your order has been delivered. Enjoy!" },
  cancelled:        { title: "Order Cancelled", message: "Your order has been cancelled." },
  refunded:         { title: "Refund Processed", message: "Your refund has been processed." },
};

const STOCK_RESTORE_STATUSES = new Set(["cancelled", "refunded"]);

// GET /api/orders
router.get("/", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, shopId, page = "1", limit = "20", search } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};
  if (req.user!.role === "customer") filter["customerId"] = req.user!.userId;
  if (status) filter["status"] = status;
  if (shopId) filter["shopId"] = shopId;
  if (search) {
    filter["$or"] = [
      { customerName: { $regex: search, $options: "i" } },
      { shopName: { $regex: search, $options: "i" } },
    ];
  }
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [orders, total] = await Promise.all([
    Order.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
    Order.countDocuments(filter),
  ]);
  res.json({ success: true, orders, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

// GET /api/orders/:id
router.get("/:id", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const order = await Order.findById(req.params["id"]);
  if (!order) { res.status(404).json({ success: false, message: "Not found" }); return; }
  if (req.user!.role === "customer" && order.customerId !== req.user!.userId) {
    res.status(403).json({ success: false, message: "Forbidden" });
    return;
  }
  res.json({ success: true, order });
});

// POST /api/orders
router.post("/", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;

  type OrderItemInput = { productId: string; productName: string; qty: number; price: number; category: string };
  const items = (body["items"] as OrderItemInput[]) ?? [];
  const reducedProducts: Array<{ productId: string; qty: number }> = [];

  for (const item of items) {
    const updated = await Product.findOneAndUpdate(
      { _id: item.productId, stock: { $gte: item.qty }, status: { $ne: "inactive" } },
      { $inc: { stock: -item.qty } },
      { new: true }
    );

    if (!updated) {
      if (reducedProducts.length > 0) {
        await Promise.all(reducedProducts.map(r =>
          Product.findByIdAndUpdate(r.productId, { $inc: { stock: r.qty } })
        ));
      }
      res.status(400).json({
        success: false,
        message: `"${item.productName}" is out of stock or unavailable.`,
      });
      return;
    }

    reducedProducts.push({ productId: item.productId, qty: item.qty });

    if (updated.stock === 0) {
      await Product.findByIdAndUpdate(item.productId, { status: "out_of_stock" });
    }
  }

  const subtotal = Number(body["subtotal"] ?? 0);
  const deliveryCharge = Number(body["deliveryCharge"] ?? 0);
  const couponDiscount = Number(body["couponDiscount"] ?? 0);
  const netAmount = subtotal + deliveryCharge - couponDiscount;

  const shopId = String(body["shopId"] ?? "");

  // Look up shop to get owner ID and shop type slug for accurate commission resolution
  const shop = await Shop.findById(shopId).select("ownerId shopType ownerName").lean();

  // Resolve commission using priority chain: vendor > shop_type > global
  const resolved = await resolveCommission({
    vendorId: shop ? String(shop.ownerId) : shopId,
    shopTypeSlug: shop?.shopType,
  });
  const commissionRate = resolved.rate;
  const commissionAmount = calculateCommissionAmount(netAmount, resolved);
  const vendorPayable = +(netAmount - commissionAmount).toFixed(2);

  const order = await Order.create({
    ...body,
    customerId: req.user!.userId,
    netAmount,
    commissionRate,
    commissionAmount,
    vendorPayable,
    platformRevenue: commissionAmount,
    paymentStatus: body["paymentMethod"] === "COD" ? "pending" : "success",
  });

  // Create payout record for vendor
  try {
    if (shopId && vendorPayable > 0) {
      if (shop) {
        await Payout.create({
          vendorId: String(shop.ownerId ?? shopId),
          vendorName: shop.ownerName ?? String(body["shopName"] ?? ""),
          shopId,
          amount: vendorPayable,
          status: "pending",
          ordersIncluded: [String(order._id)],
        });
      }
    }
  } catch { /* non-fatal — payout can be created manually */ }

  const couponCode = typeof body["couponCode"] === "string" ? body["couponCode"].trim().toUpperCase() : "";
  if (couponCode) {
    await Coupon.findOneAndUpdate({ code: couponCode }, { $inc: { usedCount: 1 } });
  }

  // Notify customer
  await createNotificationLimited(req.user!.userId, {
    type: "order_update",
    title: "Order Placed Successfully",
    message: `Your order #${String(order._id).slice(-6).toUpperCase()} has been placed. We'll keep you updated!`,
    data: { orderId: String(order._id) },
  });

  // Notify vendor/shop owner
  try {
    if (shopId) {
      const shop = await Shop.findById(shopId);
      if (shop?.ownerId) {
        const vendor = await User.findById(shop.ownerId);
        if (vendor) {
          await createNotificationLimited(String(vendor._id), {
            type: "order_update",
            title: "New Order Received",
            message: `You have a new order #${String(order._id).slice(-6).toUpperCase()} worth ₹${netAmount}.`,
            data: { orderId: String(order._id) },
          });
        }
      }
    }
  } catch { /* ignore vendor notification errors */ }

  res.status(201).json({ success: true, order });
});

// PATCH /api/orders/:id/status
router.patch("/:id/status", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, cancelReason } = req.body as { status: string; cancelReason?: string };
  const update: Record<string, unknown> = { status };
  if (cancelReason) update["cancelReason"] = cancelReason;
  const order = await Order.findByIdAndUpdate(req.params["id"], update, { new: true });
  if (!order) { res.status(404).json({ success: false, message: "Not found" }); return; }

  if (STOCK_RESTORE_STATUSES.has(status) && order.items?.length) {
    await Promise.all(order.items.map(async item => {
      const product = await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: item.qty } },
        { new: true }
      );
      if (product && product.stock > 0 && product.status === "out_of_stock") {
        await Product.findByIdAndUpdate(item.productId, { status: "active" });
      }
    }));
  }

  try {
    const msg = STATUS_MESSAGES[status];
    if (msg && order.customerId) {
      await createNotificationLimited(order.customerId, {
        type: "order_update",
        title: msg.title,
        message: msg.message,
        data: { orderId: String(order._id), status },
      });
    }
  } catch { /* ignore */ }

  res.json({ success: true, order });
});

// POST /api/orders/:id/refund
router.post("/:id/refund", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const order = await Order.findByIdAndUpdate(
    req.params["id"],
    { status: "refunded", paymentStatus: "refunded", refundedAt: new Date() },
    { new: true }
  );
  if (!order) { res.status(404).json({ success: false, message: "Not found" }); return; }

  if (order.items?.length) {
    await Promise.all(order.items.map(async item => {
      const product = await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: item.qty } },
        { new: true }
      );
      if (product && product.stock > 0 && product.status === "out_of_stock") {
        await Product.findByIdAndUpdate(item.productId, { status: "active" });
      }
    }));
  }

  try {
    if (order.customerId) {
      await createNotificationLimited(order.customerId, {
        type: "order_update",
        title: "Refund Processed",
        message: `Your refund for order #${String(order._id).slice(-6).toUpperCase()} has been processed.`,
        data: { orderId: String(order._id) },
      });
    }
  } catch { /* ignore */ }

  res.json({ success: true, order });
});

export default router;
