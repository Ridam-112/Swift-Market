import { Router, type Request, type Response } from "express";
import { HeroBanner } from "../../models/HeroBanner.js";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";

const router = Router();
const A = requireRole("admin", "super_admin");

// GET /api/hero-banners — public, active banners sorted by displayOrder
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  const banners = await HeroBanner.find({ isActive: true }).sort({ displayOrder: 1 });
  res.json({ success: true, banners });
});

// GET /api/hero-banners/admin — admin, all banners with analytics totals
router.get("/admin", authenticate, A, async (_req: AuthRequest, res: Response): Promise<void> => {
  const banners = await HeroBanner.find({}).sort({ displayOrder: 1 });
  const totalViews = banners.reduce((s, b) => s + b.views, 0);
  const totalClicks = banners.reduce((s, b) => s + b.clicks, 0);
  res.json({ success: true, banners, totalViews, totalClicks });
});

// POST /api/hero-banners — admin, create banner
router.post("/", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const banner = await HeroBanner.create(req.body as Record<string, unknown>);
  res.status(201).json({ success: true, banner });
});

// POST /api/hero-banners/batch-view — public, bulk-increment views
router.post("/batch-view", async (req: Request, res: Response): Promise<void> => {
  const { ids } = req.body as { ids?: string[] };
  if (!Array.isArray(ids) || ids.length === 0) {
    res.json({ success: true });
    return;
  }
  await HeroBanner.updateMany({ _id: { $in: ids } }, { $inc: { views: 1 } });
  res.json({ success: true });
});

// POST /api/hero-banners/:id/click — public, increment click count
router.post("/:id/click", async (req: Request, res: Response): Promise<void> => {
  await HeroBanner.findByIdAndUpdate(req.params["id"], { $inc: { clicks: 1 } });
  res.json({ success: true });
});

// PATCH /api/hero-banners/:id — admin, update banner
router.patch("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const banner = await HeroBanner.findByIdAndUpdate(
    req.params["id"],
    req.body as Record<string, unknown>,
    { new: true, runValidators: true }
  );
  if (!banner) { res.status(404).json({ success: false, message: "Banner not found" }); return; }
  res.json({ success: true, banner });
});

// DELETE /api/hero-banners/:id — admin, delete banner
router.delete("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  await HeroBanner.findByIdAndDelete(req.params["id"]);
  res.json({ success: true, message: "Banner deleted" });
});

export default router;
