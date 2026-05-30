import { Router, type Response } from "express";
import { Order } from "../../models/Order.js";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { resolveCommissionRate } from "../../utils/commission.js";

const router = Router();
const A = requireRole("admin", "super_admin");

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
  const subtotal = Number(body["subtotal"] ?? 0);
  const deliveryCharge = Number(body["deliveryCharge"] ?? 0);
  const couponDiscount = Number(body["couponDiscount"] ?? 0);
  const netAmount = subtotal + deliveryCharge - couponDiscount;

  const commissionRate = await resolveCommissionRate({ vendorId: String(body["shopId"] ?? "") });
  const commissionAmount = +(netAmount * commissionRate / 100).toFixed(2);
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
  res.status(201).json({ success: true, order });
});

// PATCH /api/orders/:id/status
router.patch("/:id/status", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, cancelReason } = req.body as { status: string; cancelReason?: string };
  const update: Record<string, unknown> = { status };
  if (cancelReason) update["cancelReason"] = cancelReason;
  const order = await Order.findByIdAndUpdate(req.params["id"], update, { new: true });
  if (!order) { res.status(404).json({ success: false, message: "Not found" }); return; }
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
  res.json({ success: true, order });
});

export default router;
