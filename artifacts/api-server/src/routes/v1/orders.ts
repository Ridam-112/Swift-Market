import { Router, type Response } from "express";
import { db, orders, products, shops, users, payouts, coupons } from "@workspace/db";
import { eq, and, ilike, or, gte, ne, desc, count, sql } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { resolveCommission, calculateCommissionAmount } from "../../utils/commission.js";
import { createNotificationLimited } from "../../utils/notification.js";
import { logger } from "../../lib/logger.js";
import { mi, miArr } from "../../utils/mapId.js";

const router = Router();
const A = requireRole("admin", "super_admin");

type OrderItem = {
  productId: string;
  productName: string;
  qty: number;
  price: number;
  category: string;
  commissionType?: string;
  commissionRate?: number;
  commissionAmount?: number;
  commissionLevel?: string;
};

const STATUS_MESSAGES: Record<string, { title: string; message: string }> = {
  placed:           { title: "Order Placed",       message: "Your order has been placed successfully!" },
  confirmed:        { title: "Order Confirmed",     message: "Your order has been confirmed by the shop." },
  packed:           { title: "Order Packed",        message: "Your order is packed and ready for pickup." },
  out_for_delivery: { title: "Out for Delivery",    message: "Your order is on the way! 🚚" },
  delivered:        { title: "Order Delivered",     message: "Your order has been delivered. Enjoy!" },
  cancelled:        { title: "Order Cancelled",     message: "Your order has been cancelled." },
  refunded:         { title: "Refund Processed",    message: "Your refund has been processed." },
};

const STOCK_RESTORE_STATUSES = new Set(["cancelled", "refunded"]);

// All valid order statuses — rejects arbitrary strings (L1)
const VALID_STATUSES = new Set([
  "placed", "confirmed", "packed", "out_for_delivery", "delivered", "cancelled", "refunded",
]);

// Restore stock for a list of order items and re-activate any that had gone out_of_stock
async function restoreStock(items: OrderItem[]): Promise<void> {
  await Promise.all(items.map(async item => {
    const [updated] = await db.update(products)
      .set({ stock: sql`${products.stock} + ${item.qty}` })
      .where(eq(products.id, item.productId))
      .returning({ stock: products.stock, status: products.status });
    if (updated && updated.stock > 0 && updated.status === "out_of_stock") {
      await db.update(products).set({ status: "active" }).where(eq(products.id, item.productId));
    }
  }));
}

// Cancel the payout associated with an order and decrement coupon usage (M1, M5)
async function reverseOrderFinancials(order: { id: string; shopId: string; couponCode?: string | null }): Promise<void> {
  await db.update(payouts)
    .set({ status: "cancelled" })
    .where(sql`${payouts.ordersIncluded} @> ${JSON.stringify([order.id])}::jsonb`)
    .catch(() => {});

  if (order.couponCode) {
    await db.update(coupons)
      .set({ usedCount: sql`GREATEST(${coupons.usedCount} - 1, 0)` })
      .where(eq(coupons.code, order.couponCode))
      .catch(() => {});
  }
}

// GET /api/orders
router.get("/", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, shopId, page = "1", limit = "20", search } = req.query as Record<string, string>;
  const pg = parseInt(page), lm = parseInt(limit);
  const conditions = [];

  if (req.user!.role === "customer") conditions.push(eq(orders.customerId, req.user!.userId));
  if (status) conditions.push(eq(orders.status, status));
  if (shopId) conditions.push(eq(orders.shopId, shopId));
  if (search) {
    conditions.push(or(
      ilike(orders.customerName, `%${search}%`),
      ilike(orders.shopName, `%${search}%`),
    )!);
  }

  const where = conditions.length ? and(...conditions) : undefined;
  const skip = (pg - 1) * lm;

  const [result, [{ total }]] = await Promise.all([
    db.select().from(orders).where(where).orderBy(desc(orders.createdAt)).offset(skip).limit(lm),
    db.select({ total: count() }).from(orders).where(where),
  ]);

  res.json({ success: true, orders: miArr(result), total: Number(total), page: pg, pages: Math.ceil(Number(total) / lm) });
});

// GET /api/orders/:id
router.get("/:id", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const [order] = await db.select().from(orders).where(eq(orders.id, req.params["id"]!)).limit(1);
  if (!order) { res.status(404).json({ success: false, message: "Not found" }); return; }
  if (req.user!.role === "customer" && order.customerId !== req.user!.userId) {
    res.status(403).json({ success: false, message: "Forbidden" });
    return;
  }
  res.json({ success: true, order: mi(order) });
});

// POST /api/orders
router.post("/", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;

  type OrderItemInput = { productId: string; productName: string; qty: number; price: number; category: string };
  const items = (body["items"] as OrderItemInput[]) ?? [];
  const reducedProducts: Array<{ productId: string; qty: number; dbPrice: number }> = [];

  // Stock deduction — captured outside try so rollback helper can access it
  const rollbackStock = () =>
    Promise.all(reducedProducts.map(r =>
      db.update(products)
        .set({ stock: sql`${products.stock} + ${r.qty}` })
        .where(eq(products.id, r.productId))
    ));

  for (const item of items) {
    // Atomic: decrement only if stock >= qty and product is not inactive
    const [updated] = await db.update(products)
      .set({ stock: sql`${products.stock} - ${item.qty}` })
      .where(and(
        eq(products.id, item.productId),
        gte(products.stock, item.qty),
        ne(products.status, "inactive"),
      ))
      .returning({ id: products.id, price: products.price, stock: products.stock });

    if (!updated) {
      if (reducedProducts.length > 0) await rollbackStock();
      res.status(400).json({
        success: false,
        message: `"${item.productName}" is out of stock or unavailable.`,
      });
      return;
    }

    reducedProducts.push({ productId: item.productId, qty: item.qty, dbPrice: updated.price });

    if (updated.stock === 0) {
      await db.update(products).set({ status: "out_of_stock" }).where(eq(products.id, item.productId));
    }
  }

  try {
    // Recalculate subtotal from real DB prices, ignore client value
    const subtotal = +reducedProducts
      .reduce((sum, r) => sum + r.dbPrice * r.qty, 0)
      .toFixed(2);
    const deliveryCharge = Number(body["deliveryCharge"] ?? 0);
    const couponDiscount = Number(body["couponDiscount"] ?? 0);
    const netAmount = subtotal + deliveryCharge - couponDiscount;

    const shopId = String(body["shopId"] ?? "");

    // Look up shop to get owner ID and shop type slug for accurate commission resolution
    const [shop] = await db.select({ id: shops.id, ownerId: shops.ownerId, shopType: shops.shopType, ownerName: shops.ownerName })
      .from(shops).where(eq(shops.id, shopId)).limit(1);
    const vendorId = shop ? shop.ownerId : shopId;

    // Per-item commission calculation (product-level has highest priority)
    let totalCommissionAmount = 0;
    const enrichedItems: Array<OrderItemInput & {
      commissionType: string;
      commissionRate: number;
      commissionAmount: number;
      commissionLevel: string;
    }> = [];

    for (const item of items) {
      const lineTotal = item.price * item.qty;
      const itemResolved = await resolveCommission({
        productId: item.productId,
        vendorId,
        categorySlug: item.category,
        shopTypeSlug: shop?.shopType ?? undefined,
      });
      const itemCommission = calculateCommissionAmount(lineTotal, itemResolved);
      totalCommissionAmount += itemCommission;
      enrichedItems.push({
        ...item,
        commissionType: itemResolved.type,
        commissionRate: itemResolved.rate,
        commissionAmount: +itemCommission.toFixed(2),
        commissionLevel: itemResolved.level,
      });
    }

    const commissionAmount = +totalCommissionAmount.toFixed(2);
    const vendorPayable = +(netAmount - commissionAmount).toFixed(2);
    const avgRate = items.length > 0
      ? +(enrichedItems.reduce((s, it) => s + it.commissionRate, 0) / enrichedItems.length).toFixed(2)
      : 0;

    // Online payment orders start as "pending"; verify endpoint upgrades to "success"
    const paymentMethod = String(body["paymentMethod"] ?? "COD");
    const paymentStatus = paymentMethod === "COD" ? "pending" : "pending";

    const [order] = await db.insert(orders).values({
      customerId: req.user!.userId,
      customerName: String(body["customerName"] ?? ""),
      customerPhone: String(body["customerPhone"] ?? ""),
      shopId,
      shopName: String(body["shopName"] ?? ""),
      items: enrichedItems,
      subtotal,
      deliveryCharge,
      couponDiscount,
      netAmount,
      commissionRate: avgRate,
      commissionAmount,
      vendorPayable,
      platformRevenue: commissionAmount,
      paymentMethod,
      paymentStatus,
      address: (body["address"] ?? {}) as Record<string, string>,
      couponCode: typeof body["couponCode"] === "string" && body["couponCode"].trim()
        ? body["couponCode"].trim().toUpperCase()
        : undefined,
      // Store Razorpay order ID early so webhook can reconcile abandoned payments
      razorpayOrderId: typeof body["razorpayOrderId"] === "string" && body["razorpayOrderId"].trim()
        ? body["razorpayOrderId"].trim()
        : undefined,
    }).returning();

    // Create payout record for vendor
    try {
      if (shopId && vendorPayable > 0 && shop) {
        await db.insert(payouts).values({
          vendorId: shop.ownerId,
          vendorName: shop.ownerName ?? String(body["shopName"] ?? ""),
          shopId,
          amount: vendorPayable,
          orderTotal: netAmount,
          commissionAmount,
          status: "pending",
          ordersIncluded: [order!.id],
        });
      }
    } catch (payoutErr) {
      // Payout creation failed — log clearly and notify all super-admins so they can create it manually (M8)
      logger.error({ err: payoutErr, orderId: order!.id, vendorPayable }, "Payout creation FAILED — manual intervention required");
      db.select({ id: users.id }).from(users).where(eq(users.role, "super_admin")).limit(10)
        .then(admins => Promise.all(admins.map(a =>
          createNotificationLimited(a.id, {
            type: "system",
            title: "⚠️ Payout Creation Failed",
            message: `Order #${order!.id.slice(-6).toUpperCase()} — payout of ₹${vendorPayable} for shop ${String(body["shopName"] ?? shopId ?? "")} could not be created automatically. Please create it manually.`,
            data: { orderId: order!.id },
          }).catch(() => {})
        )))
        .catch(() => {});
    }

    // Increment coupon usedCount
    const couponCode = order!.couponCode;
    if (couponCode) {
      await db.update(coupons)
        .set({ usedCount: sql`${coupons.usedCount} + 1` })
        .where(eq(coupons.code, couponCode));
    }

    // Notify customer
    await createNotificationLimited(req.user!.userId, {
      type: "order_update",
      title: "Order Placed Successfully",
      message: `Your order #${order!.id.slice(-6).toUpperCase()} has been placed. We'll keep you updated!`,
      data: { orderId: order!.id },
    });

    // Notify vendor/shop owner
    try {
      if (shop?.ownerId) {
        const [vendor] = await db.select({ id: users.id }).from(users).where(eq(users.id, shop.ownerId)).limit(1);
        if (vendor) {
          await createNotificationLimited(vendor.id, {
            type: "order_update",
            title: "New Order Received",
            message: `You have a new order #${order!.id.slice(-6).toUpperCase()} worth ₹${netAmount}.`,
            data: { orderId: order!.id },
          });
        }
      }
    } catch { /* ignore vendor notification errors */ }

    res.status(201).json({ success: true, order: mi(order!) });
  } catch (err) {
    // Roll back deducted stock on any unexpected error
    await rollbackStock().catch(() => {});
    throw err; // re-throw so Express 5 global error handler returns 500
  }
});

// PATCH /api/orders/:id/status
router.patch("/:id/status", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, cancelReason } = req.body as { status: string; cancelReason?: string };

  // Validate status is a known value (L1)
  if (!VALID_STATUSES.has(status)) {
    res.status(400).json({ success: false, message: `Invalid status '${status}'` });
    return;
  }

  // Fetch current order to guard against double-reversals
  const [current] = await db.select({ status: orders.status, couponCode: orders.couponCode })
    .from(orders).where(eq(orders.id, req.params["id"]!)).limit(1);
  if (!current) { res.status(404).json({ success: false, message: "Not found" }); return; }

  const update: Record<string, unknown> = { status };
  if (cancelReason) update["cancelReason"] = cancelReason;

  const [order] = await db.update(orders)
    .set(update)
    .where(eq(orders.id, req.params["id"]!))
    .returning();
  if (!order) { res.status(404).json({ success: false, message: "Not found" }); return; }

  const wasAlreadyTerminal = STOCK_RESTORE_STATUSES.has(current.status);

  if (STOCK_RESTORE_STATUSES.has(status) && !wasAlreadyTerminal) {
    if (Array.isArray(order.items) && order.items.length) {
      await restoreStock(order.items as OrderItem[]);
    }
    await reverseOrderFinancials({ id: order.id, shopId: order.shopId, couponCode: order.couponCode });
  }

  try {
    const msg = STATUS_MESSAGES[status];
    if (msg && order.customerId) {
      await createNotificationLimited(order.customerId, {
        type: "order_update",
        title: msg.title,
        message: msg.message,
        data: { orderId: order.id, status },
      });
    }
  } catch { /* ignore */ }

  res.json({ success: true, order: mi(order) });
});

// POST /api/orders/:id/refund
router.post("/:id/refund", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  // Fetch current state to avoid double-reversals
  const [current] = await db.select({ status: orders.status })
    .from(orders).where(eq(orders.id, req.params["id"]!)).limit(1);

  const [order] = await db.update(orders)
    .set({ status: "refunded", paymentStatus: "refunded", refundedAt: new Date() })
    .where(eq(orders.id, req.params["id"]!))
    .returning();
  if (!order) { res.status(404).json({ success: false, message: "Not found" }); return; }

  const wasAlreadyTerminal = current && STOCK_RESTORE_STATUSES.has(current.status);

  if (!wasAlreadyTerminal) {
    if (Array.isArray(order.items) && order.items.length) {
      await restoreStock(order.items as OrderItem[]);
    }
    await reverseOrderFinancials({ id: order.id, shopId: order.shopId, couponCode: order.couponCode });
  }

  try {
    if (order.customerId) {
      await createNotificationLimited(order.customerId, {
        type: "order_update",
        title: "Refund Processed",
        message: `Your refund for order #${order.id.slice(-6).toUpperCase()} has been processed.`,
        data: { orderId: order.id },
      });
    }
  } catch { /* ignore */ }

  res.json({ success: true, order: mi(order) });
});

export default router;
