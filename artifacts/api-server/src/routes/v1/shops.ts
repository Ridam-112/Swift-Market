import { Router, type Request, type Response } from "express";
import { Shop } from "../../models/Shop.js";
import { User } from "../../models/User.js";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";

const router = Router();
const A = requireRole("admin", "super_admin");

// GET /api/shops
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const { status, shopType, city, ownerId, pincode, page = "1", limit = "20" } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};
  if (status) filter["status"] = status;
  if (shopType) filter["shopType"] = shopType;
  if (city) filter["address.city"] = { $regex: city, $options: "i" };
  if (ownerId) filter["ownerId"] = ownerId;
  if (pincode) filter["address.pincode"] = pincode;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [shops, total] = await Promise.all([
    Shop.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
    Shop.countDocuments(filter),
  ]);
  res.json({ success: true, shops, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

// GET /api/shops/:id
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const shop = await Shop.findById(req.params["id"]);
  if (!shop) { res.status(404).json({ success: false, message: "Shop not found" }); return; }
  res.json({ success: true, shop });
});

// POST /api/shops — vendor applies
router.post("/", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const shop = await Shop.create({ ...body, ownerId: req.user!.userId, status: "pending" });
  await User.findByIdAndUpdate(req.user!.userId, { vendorStatus: "pending" });
  res.status(201).json({ success: true, shop });
});

// PATCH /api/shops/:id
router.patch("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const shop = await Shop.findByIdAndUpdate(req.params["id"], req.body as Record<string, unknown>, {
    new: true,
    runValidators: true,
  });
  if (!shop) { res.status(404).json({ success: false, message: "Shop not found" }); return; }
  res.json({ success: true, shop });
});

// POST /api/shops/:id/approve
router.post("/:id/approve", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const shop = await Shop.findByIdAndUpdate(req.params["id"], { status: "approved", isOpen: true }, { new: true });
  if (!shop) { res.status(404).json({ success: false, message: "Shop not found" }); return; }
  await User.findOneAndUpdate({ phone: shop.phone }, { vendorStatus: "approved", role: "vendor" });
  res.json({ success: true, shop });
});

// POST /api/shops/:id/reject
router.post("/:id/reject", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const { reason } = req.body as { reason?: string };
  const shop = await Shop.findByIdAndUpdate(
    req.params["id"],
    { status: "rejected", rejectionReason: reason },
    { new: true }
  );
  if (!shop) { res.status(404).json({ success: false, message: "Shop not found" }); return; }
  await User.findOneAndUpdate({ phone: shop.phone }, { vendorStatus: "rejected" });
  res.json({ success: true, shop });
});

// POST /api/shops/:id/ban
router.post("/:id/ban", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const shop = await Shop.findByIdAndUpdate(req.params["id"], { status: "banned", isOpen: false }, { new: true });
  if (!shop) { res.status(404).json({ success: false, message: "Shop not found" }); return; }
  res.json({ success: true, shop });
});

// POST /api/shops/:id/unban
router.post("/:id/unban", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const shop = await Shop.findByIdAndUpdate(req.params["id"], { status: "approved", isOpen: true }, { new: true });
  if (!shop) { res.status(404).json({ success: false, message: "Shop not found" }); return; }
  res.json({ success: true, shop });
});

// DELETE /api/shops/:id
router.delete("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  await Shop.findByIdAndDelete(req.params["id"]);
  res.json({ success: true, message: "Shop deleted" });
});

export default router;
