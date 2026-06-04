import { Router, type Request, type Response } from "express";
import { Category } from "../../models/Category.js";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";

const router = Router();
const A = requireRole("admin", "super_admin");

// GET /api/categories — active only (vendor & customer use)
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 });
  res.json({ success: true, categories });
});

// GET /api/categories/all — all including inactive (admin use)
router.get("/all", authenticate, A, async (_req: Request, res: Response): Promise<void> => {
  const categories = await Category.find().sort({ name: 1 });
  res.json({ success: true, categories });
});

router.post("/", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, shopTypes, commissionRate } = req.body as {
    name: string;
    shopTypes?: string[];
    commissionRate?: number;
  };
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const cat = await Category.create({ name, slug, shopTypes, commissionRate });
  res.status(201).json({ success: true, category: cat });
});

router.patch("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const cat = await Category.findByIdAndUpdate(req.params["id"], req.body as Record<string, unknown>, { new: true });
  if (!cat) { res.status(404).json({ success: false, message: "Not found" }); return; }
  res.json({ success: true, category: cat });
});

router.delete("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  await Category.findByIdAndDelete(req.params["id"]);
  res.json({ success: true, message: "Deleted" });
});

export default router;
