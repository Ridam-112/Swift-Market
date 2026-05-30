import { Router, type Request, type Response } from "express";
import { Product } from "../../models/Product.js";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";

const router = Router();
const A = requireRole("admin", "super_admin");
const V = requireRole("vendor", "admin", "super_admin");

// GET /api/products
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const { shopId, category, status = "active", search, page = "1", limit = "20" } =
    req.query as Record<string, string>;
  const filter: Record<string, unknown> = { status };
  if (shopId) filter["shopId"] = shopId;
  if (category) filter["category"] = category;
  if (search) filter["name"] = { $regex: search, $options: "i" };
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [products, total] = await Promise.all([
    Product.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
    Product.countDocuments(filter),
  ]);
  res.json({ success: true, products, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

// GET /api/products/:id
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const product = await Product.findById(req.params["id"]);
  if (!product) { res.status(404).json({ success: false, message: "Not found" }); return; }
  res.json({ success: true, product });
});

// POST /api/products
router.post("/", authenticate, V, async (req: AuthRequest, res: Response): Promise<void> => {
  const product = await Product.create(req.body as Record<string, unknown>);
  res.status(201).json({ success: true, product });
});

// PATCH /api/products/:id
router.patch("/:id", authenticate, V, async (req: AuthRequest, res: Response): Promise<void> => {
  const product = await Product.findByIdAndUpdate(req.params["id"], req.body as Record<string, unknown>, {
    new: true,
    runValidators: true,
  });
  if (!product) { res.status(404).json({ success: false, message: "Not found" }); return; }
  res.json({ success: true, product });
});

// DELETE /api/products/:id
router.delete("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  await Product.findByIdAndDelete(req.params["id"]);
  res.json({ success: true, message: "Deleted" });
});

export default router;
