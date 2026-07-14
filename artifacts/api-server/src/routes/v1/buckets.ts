import { Router, type Request, type Response } from "express";
import { db, buckets, products, shops } from "@workspace/db";
import { eq, inArray, asc, and, gt } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { mi, miArr } from "../../utils/mapId.js";

const router = Router();
const A = requireRole("admin", "super_admin");

async function enrichWithShopNames(rows: Record<string, unknown>[]) {
  const shopIds = [...new Set(rows.map(p => p["shopId"] as string).filter(Boolean))];
  if (shopIds.length === 0) return rows;
  const shopRows = await db.select({ id: shops.id, shopName: shops.shopName })
    .from(shops).where(inArray(shops.id, shopIds));
  const shopMap = Object.fromEntries(shopRows.map(s => [s.id, s.shopName]));
  return rows.map(p => ({ ...p, shopName: shopMap[p["shopId"] as string] ?? "" }));
}

async function resolveBucketProducts(productIds: string[], limit = 12) {
  const ids = (productIds ?? []).slice(0, 40);
  if (ids.length === 0) return [];
  const rows = await db.select().from(products)
    .where(and(eq(products.status, "active"), gt(products.stock, 0), inArray(products.id, ids)))
    .limit(limit);
  // Preserve admin-curated order rather than DB order
  const order = new Map(ids.map((id, i) => [id, i]));
  const sorted = miArr(rows).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return enrichWithShopNames(sorted);
}

// GET /api/buckets — public, active buckets flagged for the home page
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  const rows = await db.select().from(buckets)
    .where(and(eq(buckets.isActive, true), eq(buckets.showOnHomepage, true)))
    .orderBy(asc(buckets.sortOrder));

  const resolved = await Promise.all(rows.map(async (b) => {
    const productIds = (b.productIds ?? []) as string[];
    const bucketProducts = await resolveBucketProducts(productIds);
    return { ...mi(b), products: bucketProducts };
  }));

  res.json({ success: true, buckets: resolved.filter(b => b.products.length > 0) });
});

// GET /api/buckets/addons — public, active buckets flagged as checkout/cart add-ons
router.get("/addons", async (_req: Request, res: Response): Promise<void> => {
  const rows = await db.select().from(buckets)
    .where(and(eq(buckets.isActive, true), eq(buckets.showAsAddon, true)))
    .orderBy(asc(buckets.sortOrder));

  const resolved = await Promise.all(rows.map(async (b) => {
    const productIds = (b.productIds ?? []) as string[];
    const bucketProducts = await resolveBucketProducts(productIds, 20);
    return { ...mi(b), products: bucketProducts };
  }));

  res.json({ success: true, buckets: resolved.filter(b => b.products.length > 0) });
});

// GET /api/buckets/admin — admin, all buckets raw (no product resolution)
router.get("/admin", authenticate, A, async (_req: AuthRequest, res: Response): Promise<void> => {
  const rows = await db.select().from(buckets).orderBy(asc(buckets.sortOrder));
  res.json({ success: true, buckets: miArr(rows) });
});

// POST /api/buckets — admin, create bucket
router.post("/", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const [bucket] = await db.insert(buckets).values({
    title: String(body["title"] ?? "New Bucket"),
    subtitle: String(body["subtitle"] ?? ""),
    badgeText: String(body["badgeText"] ?? "🔥 Hot Pick"),
    accentColor: String(body["accentColor"] ?? "#FF6B35"),
    productIds: Array.isArray(body["productIds"]) ? body["productIds"] as string[] : [],
    comboPrice: body["comboPrice"] != null ? Number(body["comboPrice"]) : null,
    showOnHomepage: body["showOnHomepage"] != null ? Boolean(body["showOnHomepage"]) : true,
    showAsAddon: body["showAsAddon"] != null ? Boolean(body["showAsAddon"]) : true,
    isActive: body["isActive"] != null ? Boolean(body["isActive"]) : true,
    sortOrder: body["sortOrder"] != null ? Number(body["sortOrder"]) : 0,
  }).returning();
  res.status(201).json({ success: true, bucket: mi(bucket!) });
});

// PATCH /api/buckets/reorder — admin, batch update sort orders
router.patch("/reorder", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const { order } = req.body as { order: Array<{ id: string; sortOrder: number }> };
  if (!Array.isArray(order)) { res.status(400).json({ success: false, message: "order must be an array" }); return; }
  await Promise.all(order.map(({ id, sortOrder }) =>
    db.update(buckets).set({ sortOrder }).where(eq(buckets.id, id))
  ));
  res.json({ success: true });
});

// PATCH /api/buckets/:id — admin, update bucket
router.patch("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const updates: Record<string, unknown> = {};
  if ("title" in body) updates["title"] = String(body["title"]);
  if ("subtitle" in body) updates["subtitle"] = String(body["subtitle"]);
  if ("badgeText" in body) updates["badgeText"] = String(body["badgeText"]);
  if ("accentColor" in body) updates["accentColor"] = String(body["accentColor"]);
  if ("productIds" in body) updates["productIds"] = Array.isArray(body["productIds"]) ? body["productIds"] : [];
  if ("comboPrice" in body) updates["comboPrice"] = body["comboPrice"] != null ? Number(body["comboPrice"]) : null;
  if ("showOnHomepage" in body) updates["showOnHomepage"] = Boolean(body["showOnHomepage"]);
  if ("showAsAddon" in body) updates["showAsAddon"] = Boolean(body["showAsAddon"]);
  if ("isActive" in body) updates["isActive"] = Boolean(body["isActive"]);
  if ("sortOrder" in body) updates["sortOrder"] = Number(body["sortOrder"]);
  updates["updatedAt"] = new Date();

  const [bucket] = await db.update(buckets)
    .set(updates)
    .where(eq(buckets.id, req.params["id"] as string))
    .returning();
  if (!bucket) { res.status(404).json({ success: false, message: "Bucket not found" }); return; }
  res.json({ success: true, bucket: mi(bucket) });
});

// DELETE /api/buckets/:id — admin, delete bucket
router.delete("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  await db.delete(buckets).where(eq(buckets.id, req.params["id"] as string));
  res.json({ success: true, message: "Bucket deleted" });
});

export default router;
