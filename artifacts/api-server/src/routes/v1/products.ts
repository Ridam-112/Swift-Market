import { Router, type Request, type Response } from "express";
import { db, products, shops, categories } from "@workspace/db";
import { eq, and, ilike, inArray, desc, count, gt, sql } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { deleteFromCloudinary } from "../../lib/cloudinary.js";
import { createNotificationLimited } from "../../utils/notification.js";
import { mi, miArr } from "../../utils/mapId.js";

const router = Router();
const A = requireRole("admin", "super_admin");
const V = requireRole("vendor", "admin", "super_admin");

// GET /api/products
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const { shopId, category, status = "active", search, page = "1", limit = "20", pincode } =
    req.query as Record<string, string>;

  const pg = parseInt(page), lm = parseInt(limit);
  const conditions = [];

  // status=all skips the status filter entirely (used by admin/vendor product management)
  if (status !== "all") {
    conditions.push(eq(products.status, status));
    // For customer-facing active product listings, also exclude zero-stock products
    if (status === "active") {
      conditions.push(gt(products.stock, 0));
    }
  }

  if (category) conditions.push(eq(products.category, category));
  if (search) conditions.push(ilike(products.name, `%${search}%`));

  // For customer-facing active queries, restrict to active categories only
  if (status === "active") {
    const activeCats = await db.select({ slug: categories.slug }).from(categories).where(eq(categories.isActive, true));
    if (activeCats.length > 0) {
      const activeSlugs = activeCats.map(c => c.slug);
      if (category) {
        if (!activeSlugs.includes(category)) {
          res.json({ success: true, products: [], total: 0, page: 1, pages: 0 });
          return;
        }
        // category is already a valid active slug — no extra condition needed
      } else {
        conditions.push(inArray(products.category, activeSlugs));
      }
    }
  }

  // Shop scope
  if (pincode) {
    const pincodeShops = await db.select({ id: shops.id })
      .from(shops)
      .where(and(
        sql`${shops.address}->>'pincode' = ${pincode}`,
        eq(shops.status, "approved"),
      ));
    if (pincodeShops.length === 0) {
      res.json({ success: true, products: [], total: 0, page: pg, pages: 0 });
      return;
    }
    conditions.push(inArray(products.shopId, pincodeShops.map(s => s.id)));
  } else if (shopId) {
    if (status === "all") {
      // Vendor/admin viewing their own shop's products — no approval check needed
      conditions.push(eq(products.shopId, shopId));
    } else {
      // Customer-facing: only return products from approved shops
      const [shop] = await db.select({ status: shops.status }).from(shops).where(eq(shops.id, shopId)).limit(1);
      if (!shop || shop.status !== "approved") {
        res.json({ success: true, products: [], total: 0, page: pg, pages: 0 });
        return;
      }
      conditions.push(eq(products.shopId, shopId));
    }
  } else {
    // No shopId, no pincode — restrict to products from approved shops
    const approvedShops = await db.select({ id: shops.id }).from(shops).where(eq(shops.status, "approved"));
    if (approvedShops.length === 0) {
      res.json({ success: true, products: [], total: 0, page: pg, pages: 0 });
      return;
    }
    conditions.push(inArray(products.shopId, approvedShops.map(s => s.id)));
  }

  const where = conditions.length ? and(...conditions) : undefined;
  const skip = (pg - 1) * lm;

  const [result, [{ total }]] = await Promise.all([
    db.select().from(products).where(where).orderBy(desc(products.createdAt)).offset(skip).limit(lm),
    db.select({ total: count() }).from(products).where(where),
  ]);

  res.json({ success: true, products: miArr(result), total: Number(total), page: pg, pages: Math.ceil(Number(total) / lm) });
});

// GET /api/products/admin-review — admin: list products for approval with shop name
// IMPORTANT: must be defined before /:id to avoid route conflict
router.get("/admin-review", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const { status = "pending", page = "1", limit = "50" } = req.query as Record<string, string>;
  const pg = parseInt(page), lm = parseInt(limit);
  const where = status !== "all" ? eq(products.status, status) : undefined;
  const skip = (pg - 1) * lm;

  const [result, [{ total }]] = await Promise.all([
    db.select().from(products).where(where).orderBy(desc(products.createdAt)).offset(skip).limit(lm),
    db.select({ total: count() }).from(products).where(where),
  ]);

  // Batch-fetch shop names
  const shopIds = [...new Set(result.map(p => p.shopId))];
  const shopRows = shopIds.length > 0
    ? await db.select({ id: shops.id, shopName: shops.shopName }).from(shops).where(inArray(shops.id, shopIds))
    : [];
  const shopMap = Object.fromEntries(shopRows.map(s => [s.id, s.shopName]));

  const enriched = result.map(p => ({ ...mi(p), shopName: shopMap[p.shopId] ?? "Unknown Shop" }));
  res.json({ success: true, products: enriched, total: Number(total), page: pg, pages: Math.ceil(Number(total) / lm) });
});

// GET /api/products/:id
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const [product] = await db.select().from(products).where(eq(products.id, req.params["id"]!)).limit(1);
  if (!product) { res.status(404).json({ success: false, message: "Not found" }); return; }
  res.json({ success: true, product: mi(product) });
});

// POST /api/products
router.post("/", authenticate, V, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const isAdmin = req.user!.role === "admin" || req.user!.role === "super_admin";

  // Admin can create a product for any shop by passing shopId directly (may specify status)
  if (isAdmin && body["shopId"]) {
    const [shopExists] = await db.select({ id: shops.id }).from(shops).where(eq(shops.id, String(body["shopId"]))).limit(1);
    if (!shopExists) { res.status(400).json({ success: false, message: "Shop not found" }); return; }
    const [product] = await db.insert(products).values({
      name: String(body["name"] ?? ""),
      description: body["description"] ? String(body["description"]) : undefined,
      price: Number(body["price"] ?? 0),
      discountedPrice: body["discountedPrice"] != null ? Number(body["discountedPrice"]) : undefined,
      category: String(body["category"] ?? ""),
      subcategory: body["subcategory"] ? String(body["subcategory"]) : undefined,
      shopId: String(body["shopId"]),
      images: Array.isArray(body["images"]) ? (body["images"] as string[]) : [],
      stock: body["stock"] != null ? Number(body["stock"]) : 0,
      sku: body["sku"] ? String(body["sku"]) : undefined,
      unit: body["unit"] ? String(body["unit"]) : undefined,
      commissionRate: body["commissionRate"] != null ? Number(body["commissionRate"]) : undefined,
      trending: Boolean(body["trending"] ?? false),
      status: body["status"] ? String(body["status"]) : "pending",
    }).returning();
    res.status(201).json({ success: true, product: mi(product!) });
    return;
  }

  const [shop] = await db.select({ id: shops.id }).from(shops).where(eq(shops.ownerId, req.user!.userId)).limit(1);
  if (!shop) { res.status(400).json({ success: false, message: "No approved shop found for this vendor" }); return; }

  // Vendor uploads always start as pending — strip any status the client may have sent
  const { status: _ignored, ...safeBody } = body;
  const [product] = await db.insert(products).values({
    name: String(safeBody["name"] ?? ""),
    description: safeBody["description"] ? String(safeBody["description"]) : undefined,
    price: Number(safeBody["price"] ?? 0),
    discountedPrice: safeBody["discountedPrice"] != null ? Number(safeBody["discountedPrice"]) : undefined,
    category: String(safeBody["category"] ?? ""),
    subcategory: safeBody["subcategory"] ? String(safeBody["subcategory"]) : undefined,
    shopId: shop.id,
    images: Array.isArray(safeBody["images"]) ? (safeBody["images"] as string[]) : [],
    stock: safeBody["stock"] != null ? Number(safeBody["stock"]) : 0,
    sku: safeBody["sku"] ? String(safeBody["sku"]) : undefined,
    unit: safeBody["unit"] ? String(safeBody["unit"]) : undefined,
    commissionRate: safeBody["commissionRate"] != null ? Number(safeBody["commissionRate"]) : undefined,
    trending: Boolean(safeBody["trending"] ?? false),
    status: "pending",
  }).returning();
  res.status(201).json({ success: true, product: mi(product!) });
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

  const updatePayload = action === "approve"
    ? { status: "active", rejectionReason: null as string | null }
    : { status: "rejected", rejectionReason: rejectionReason!.trim() };

  const [product] = await db.update(products).set(updatePayload).where(eq(products.id, req.params["id"]!)).returning();
  if (!product) { res.status(404).json({ success: false, message: "Product not found" }); return; }

  // Notify the vendor who owns this product
  try {
    const [shop] = await db.select({ ownerId: shops.ownerId }).from(shops).where(eq(shops.id, product.shopId)).limit(1);
    if (shop?.ownerId) {
      if (action === "approve") {
        await createNotificationLimited(shop.ownerId, {
          type: "system",
          title: "✅ Product Approved",
          message: `Your product "${product.name}" has been approved by SwiftMart and is now visible to customers.`,
          data: { productId: product.id },
        });
      } else {
        await createNotificationLimited(shop.ownerId, {
          type: "system",
          title: "❌ Product Rejected",
          message: `Your product "${product.name}" has been rejected.\n\nReason:\n${rejectionReason}`,
          data: { productId: product.id, rejectionReason },
        });
      }
    }
  } catch {
    // Non-fatal — product status was updated; notification failure should not block response
  }

  res.json({ success: true, product: mi(product) });
});

// PATCH /api/products/:id — vendor/admin edit
// Vendor edits always reset status to "pending" and verify ownership (M2)
router.patch("/:id", authenticate, V, async (req: AuthRequest, res: Response): Promise<void> => {
  const isAdmin = req.user!.role === "admin" || req.user!.role === "super_admin";
  const body = req.body as Record<string, unknown>;

  if (!isAdmin) {
    // Verify the vendor owns this product's shop
    const [existing] = await db.select({ shopId: products.shopId })
      .from(products).where(eq(products.id, req.params["id"]!)).limit(1);
    if (!existing) { res.status(404).json({ success: false, message: "Not found" }); return; }

    const [shop] = await db.select({ id: shops.id }).from(shops)
      .where(eq(shops.ownerId, req.user!.userId)).limit(1);
    if (!shop || shop.id !== existing.shopId) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }
  }

  const updateData: Record<string, unknown> = { ...body };
  if (!isAdmin) {
    // Vendor edits must go through re-approval — force status back to pending
    updateData["status"] = "pending";
    delete updateData["rejectionReason"];
  }

  const [product] = await db.update(products)
    .set(updateData)
    .where(eq(products.id, req.params["id"]!))
    .returning();
  if (!product) { res.status(404).json({ success: false, message: "Not found" }); return; }
  res.json({ success: true, product: mi(product) });
});

// DELETE /api/products/:id
router.delete("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const [product] = await db.select({ images: products.images }).from(products).where(eq(products.id, req.params["id"]!)).limit(1);
  if (product?.images && (product.images as string[]).length > 0) {
    await Promise.all((product.images as string[]).map(url => deleteFromCloudinary(url)));
  }
  await db.delete(products).where(eq(products.id, req.params["id"]!));
  res.json({ success: true, message: "Deleted" });
});

export default router;
