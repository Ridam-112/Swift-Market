import { Router, type Request, type Response } from "express";
import { Coupon } from "../../models/Coupon.js";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";

const router = Router();
const A = requireRole("admin", "super_admin");

router.get("/", authenticate, A, async (_req: Request, res: Response): Promise<void> => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json({ success: true, coupons });
});

router.post("/validate", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { code, orderTotal } = req.body as { code: string; orderTotal: number };
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
  if (!coupon) { res.status(404).json({ success: false, message: "Invalid coupon code" }); return; }
  if (coupon.expiryDate < new Date()) { res.status(400).json({ success: false, message: "Coupon expired" }); return; }
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    res.status(400).json({ success: false, message: "Coupon usage limit reached" });
    return;
  }
  if (orderTotal < coupon.minimumOrder) {
    res.status(400).json({ success: false, message: `Minimum order ₹${coupon.minimumOrder} required` });
    return;
  }
  let discount = 0;
  if (coupon.type === "percentage") {
    discount = Math.min((orderTotal * coupon.value) / 100, coupon.maximumDiscount ?? Infinity);
  } else if (coupon.type === "fixed") {
    discount = coupon.value;
  }
  res.json({ success: true, coupon, discount: +discount.toFixed(2) });
});

router.post("/", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const coupon = await Coupon.create(req.body as Record<string, unknown>);
  res.status(201).json({ success: true, coupon });
});

router.patch("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const coupon = await Coupon.findByIdAndUpdate(req.params["id"], req.body as Record<string, unknown>, { new: true });
  if (!coupon) { res.status(404).json({ success: false, message: "Not found" }); return; }
  res.json({ success: true, coupon });
});

router.delete("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  await Coupon.findByIdAndDelete(req.params["id"]);
  res.json({ success: true, message: "Deleted" });
});

export default router;
