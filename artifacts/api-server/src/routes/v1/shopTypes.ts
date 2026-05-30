import { Router, type Request, type Response } from "express";
import { ShopType } from "../../models/ShopType.js";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";

const router = Router();
const A = requireRole("admin", "super_admin");

router.get("/", async (_req: Request, res: Response): Promise<void> => {
  const types = await ShopType.find().sort({ name: 1 });
  res.json({ success: true, shopTypes: types });
});

router.get("/active", async (_req: Request, res: Response): Promise<void> => {
  const types = await ShopType.find({ isActive: true }).sort({ name: 1 });
  res.json({ success: true, shopTypes: types });
});

router.post("/", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, commissionRate } = req.body as { name: string; commissionRate?: number };
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const st = await ShopType.create({ name, slug, commissionRate });
  res.status(201).json({ success: true, shopType: st });
});

router.patch("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const st = await ShopType.findByIdAndUpdate(req.params["id"], req.body as Record<string, unknown>, { new: true });
  if (!st) { res.status(404).json({ success: false, message: "Not found" }); return; }
  res.json({ success: true, shopType: st });
});

router.delete("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  await ShopType.findByIdAndDelete(req.params["id"]);
  res.json({ success: true, message: "Deleted" });
});

export default router;
