import { Router, type Response } from "express";
import { Admin } from "../../models/Admin.js";
import { User } from "../../models/User.js";
import { Shop } from "../../models/Shop.js";
import { Order } from "../../models/Order.js";
import { DeliveryPartner } from "../../models/DeliveryPartner.js";
import { Payout } from "../../models/Payout.js";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";

const router = Router();
const SA = requireRole("super_admin");
const A = requireRole("admin", "super_admin");

// GET /api/admin/stats
router.get("/stats", authenticate, A, async (_req, res: Response): Promise<void> => {
  const [totalUsers, totalShops, pendingShops, totalOrders, pendingOrders, activeDelivery, pendingPayouts] =
    await Promise.all([
      User.countDocuments({ role: "customer" }),
      Shop.countDocuments({ status: "approved" }),
      Shop.countDocuments({ status: "pending" }),
      Order.countDocuments(),
      Order.countDocuments({ status: { $in: ["placed", "accepted", "preparing", "packed"] } }),
      DeliveryPartner.countDocuments({ status: "active", isAvailable: true }),
      Payout.countDocuments({ status: "pending" }),
    ]);

  const revenueAgg = await Order.aggregate([
    { $match: { status: "delivered" } },
    { $group: { _id: null, totalRevenue: { $sum: "$netAmount" }, totalCommission: { $sum: "$commissionAmount" } } },
  ]);
  const { totalRevenue = 0, totalCommission = 0 } = (revenueAgg[0] as { totalRevenue: number; totalCommission: number }) ?? {};

  res.json({
    success: true,
    stats: {
      totalUsers,
      totalShops,
      pendingShops,
      totalOrders,
      pendingOrders,
      activeDelivery,
      pendingPayouts,
      totalRevenue,
      totalCommission,
    },
  });
});

// GET /api/admin/admins
router.get("/admins", authenticate, SA, async (_req, res: Response): Promise<void> => {
  const admins = await Admin.find().sort({ createdAt: -1 }).select("-activityLog");
  res.json({ success: true, admins });
});

// POST /api/admin/admins
router.post("/admins", authenticate, SA, async (req: AuthRequest, res: Response): Promise<void> => {
  const { phone, name, role = "admin" } = req.body as {
    phone: string;
    name: string;
    role?: "admin" | "super_admin";
  };
  if (!phone || !name) {
    res.status(400).json({ success: false, message: "Phone and name required" });
    return;
  }
  const existing = await Admin.findOne({ phone });
  if (existing) {
    res.status(409).json({ success: false, message: "Admin with this phone already exists" });
    return;
  }
  const admin = await Admin.create({ phone, name, role, status: "active", addedBy: req.user!.userId });
  await User.findOneAndUpdate({ phone }, { role }, { upsert: false });
  res.status(201).json({ success: true, admin });
});

// PATCH /api/admin/admins/:id
router.patch("/admins/:id", authenticate, SA, async (req: AuthRequest, res: Response): Promise<void> => {
  const { role, status } = req.body as { role?: "admin" | "super_admin"; status?: "active" | "suspended" };
  const admin = await Admin.findByIdAndUpdate(req.params["id"], { role, status }, { new: true });
  if (!admin) {
    res.status(404).json({ success: false, message: "Admin not found" });
    return;
  }
  res.json({ success: true, admin });
});

// DELETE /api/admin/admins/:id
router.delete("/admins/:id", authenticate, SA, async (req: AuthRequest, res: Response): Promise<void> => {
  await Admin.findByIdAndDelete(req.params["id"]);
  res.json({ success: true, message: "Admin removed" });
});

export default router;
