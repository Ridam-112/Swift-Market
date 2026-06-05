import { Router, type Request, type Response } from "express";
import { Product } from "../../models/Product.js";
import { Shop } from "../../models/Shop.js";
import { Category } from "../../models/Category.js";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { deleteFromCloudinary } from "../../lib/cloudinary.js";
import { createNotificationLimited } from "../../utils/notification.js";

const router = Router();
const A = requireRole("admin", "super_admin");
const V = requireRole("vendor", "admin", "super_admin");

// GET /api/products
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const { shopId, category, status = "active", search, page = "1", limit = "20", pincode } =
    req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};

  // status=all skips the status filter entirely (used by admin/vendor product management)
  if (status !== "all") {
    filter["status"] = status;
    // For customer-facing active product listings, also exclude zero-stock products
    if (status === "active") {
      filter["stock"] = { $gt: 0 };
    }
  }

  if (category) filter["category"] = category;
  if (search) filter["name"] = { $regex: search, $options: "i" };

  // For customer-facing active queries, restrict to active categories only
  if (status === "active") {
    const activeCategories = await Category.find({ isActive: true }).select("slug").lean();
    if (activeCategories.length > 0) {
      const activeSlugs = activeCategories.map(c => c.slug);
      if (category) {
        if (!activeSlugs.includes(category)) {
          res.json({ success: true, products: [], total: 0, page: 1, pages: 0 });
          return;
        }
      } else {
        filter["category"] = { $in: activeSlugs };
      }
    }
  }

  if (pincode) {
    const pincodeShops = await Shop.find({ "address.pincode": pincode, status: "approved" }).select("_id").lean();
    filter["shopId"] = { $in: pincodeShops.map(s => String(s._id)) };
  } else if (shopId) {
    const shop = await Shop.findById(shopId).select("status").lean();
    if (!shop || shop.status !== "approved") {
      res.json({ success: true, products: [], total: 0, page: 1, pages: 0 });
      return;
    }
    filter["shopId"] = shopId;
  } else {
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

// GET /api/products/admin-review — admin: list products for approval with shop name
// IMPORTANT: must be defined before /:id to avoid route conflict
router.get("/admin-review", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const { status = "pending", page = "1", limit = "50" } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};
  if (status !== "all") filter["status"] = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [products, total] = await Promise.all([
    Product.find(filter).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }).lean(),
    Product.countDocuments(filter),
  ]);

  // Batch-fetch shop names
  const shopIds = [...new Set(products.map(p => p.shopId))];
  const shops = await Shop.find({ _id: { $in: shopIds } }).select("_id shopName").lean();
  const shopMap = Object.fromEntries(shops.map(s => [String(s._id), s.shopName]));

  const enriched = products.map(p => ({ ...p, shopName: shopMap[p.shopId] ?? "Unknown Shop" }));
  res.json({ success: true, products: enriched, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

// GET /api/products/:id
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const product = await Product.findById(req.params["id"]);
  if (!product) { res.status(404).json({ success: false, message: "Not found" }); return; }
  res.json({ success: true, product });
});

// POST /api/products
router.post("/", authenticate, V, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const isAdmin = req.user!.role === "admin" || req.user!.role === "super_admin";

  // Admin can create a product for any shop by passing shopId directly (may specify status)
  if (isAdmin && body["shopId"]) {
    const shopExists = await Shop.findById(String(body["shopId"]));
    if (!shopExists) { res.status(400).json({ success: false, message: "Shop not found" }); return; }
    const product = await Product.create({ ...body, shopId: String(body["shopId"]) });
    res.status(201).json({ success: true, product });
    return;
  }

  const shop = await Shop.findOne({ ownerId: req.user!.userId });
  if (!shop) { res.status(400).json({ success: false, message: "No approved shop found for this vendor" }); return; }

  // Vendor uploads always start as pending — strip any status the client may have sent
  const { status: _ignored, ...safeBody } = body;
  const product = await Product.create({ ...safeBody, shopId: shop._id.toString(), status: "pending" });
  res.status(201).json({ success: true, product });
});

// PATCH /api/products/:id/approval — admin: approve or reject a product with notification
router.patch("/:id/approval", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const { action, rejectionReason } = req.body as { action: "approve" | "reject"; rejectionReason?: string };

  if (action !== "approve" && action !== "reject") {
    res.status(400).json({ success: false, message: "action must be 'approve' or 'reject'" });
    return;
  }
  if (action === "reject" && !rejectionReason?.trim()) {
    res.status(400).json({ success: false, message: "rejectionReason is required when rejecting" });
    return;
  }

  const updatePayload: Record<string, unknown> =
    action === "approve"
      ? { status: "active", rejectionReason: null }
      : { status: "rejected", rejectionReason: rejectionReason!.trim() };

  const product = await Product.findByIdAndUpdate(req.params["id"], updatePayload, { new: true });
  if (!product) { res.status(404).json({ success: false, message: "Product not found" }); return; }

  // Notify the vendor who owns this product
  try {
    const shop = await Shop.findById(product.shopId).select("ownerId").lean();
    if (shop?.ownerId) {
      const vendorId = String(shop.ownerId);
      if (action === "approve") {
        await createNotificationLimited(vendorId, {
          type: "system",
          title: "✅ Product Approved",
          message: `Your product "${product.name}" has been approved by SwiftMart and is now visible to customers.`,
          data: { productId: String(product._id) },
        });
      } else {
        await createNotificationLimited(vendorId, {
          type: "system",
          title: "❌ Product Rejected",
          message: `Your product "${product.name}" has been rejected.\n\nReason:\n${rejectionReason}`,
          data: { productId: String(product._id), rejectionReason },
        });
      }
    }
  } catch {
    // Non-fatal — product status was updated; notification failure should not block response
  }

  res.json({ success: true, product });
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
