import { Router, type Request, type Response } from "express";
import { Product } from "../../models/Product.js";
import { Shop } from "../../models/Shop.js";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { deleteFromCloudinary } from "../../lib/cloudinary.js";

const router = Router();
const A = requireRole("admin", "super_admin");
const V = requireRole("vendor", "admin", "super_admin");

// GET /api/products
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const { shopId, category, status = "active", search, page = "1", limit = "20", pincode } =
    req.query as Record<string, string>;
  const filter: Record<string, unknown> = { status };

  // For customer-facing active product listings, also exclude zero-stock products
  if (status === "active") {
    filter["stock"] = { $gt: 0 };
  }

  if (category) filter["category"] = category;
  if (search) filter["name"] = { $regex: search, $options: "i" };

  if (pincode) {
    // pincode browse — only approved shops in that pincode
    const pincodeShops = await Shop.find({ "address.pincode": pincode, status: "approved" }).select("_id").lean();
    filter["shopId"] = { $in: pincodeShops.map(s => String(s._id)) };
  } else if (shopId) {
    // specific shop page — verify shop is approved before returning products
    const shop = await Shop.findById(shopId).select("status").lean();
    if (!shop || shop.status !== "approved") {
      res.json({ success: true, products: [], total: 0, page: 1, pages: 0 });
      return;
    }
    filter["shopId"] = shopId;
  } else {
    // general browse (homepage, category, search) — only products from approved shops
    const approvedShops = await Shop.find({ status: "approved" }).select("_id").lean();
    filter["shopId"] = { $in: approvedShops.map(s => String(s._id)) };
  }

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
  const shop = await Shop.findOne({ ownerId: req.user!.userId });
  if (!shop) { res.status(400).json({ success: false, message: "No approved shop found for this vendor" }); return; }
  const product = await Product.create({ ...(req.body as Record<string, unknown>), shopId: shop._id.toString() });
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
  const product = await Product.findByIdAndDelete(req.params["id"]);
  if (product?.images?.length) {
    await Promise.all(product.images.map(url => deleteFromCloudinary(url)));
  }
  res.json({ success: true, message: "Deleted" });
});

export default router;
