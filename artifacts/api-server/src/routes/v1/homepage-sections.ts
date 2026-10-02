import { Router, type Request, type Response } from "express";
import { db, primaryDb, replicaDbs, homepageSections, products, shops } from "@workspace/db";
import { eq, inArray, asc, and, gt, desc, sql } from "drizzle-orm";
import { authenticate, requireRole, optionalAuth, type AuthRequest } from "../../middlewares/auth.js";
import { mi, miArr } from "../../utils/mapId.js";
import { cacheGet, cacheSet, cacheDel, KEYS, TTL } from "../../lib/cache.js";

async function enrichWithShopNames(rows: Record<string, unknown>[]) {
  const shopIds = [...new Set(rows.map(p => p["shopId"] as string).filter(Boolean))];
  if (shopIds.length === 0) return rows;
  const shopRows = await db.select({ id: shops.id, shopName: shops.shopName })
    .from(shops).where(inArray(shops.id, shopIds));
  const shopMap = Object.fromEntries(shopRows.map(s => [s.id, s.shopName]));
  return rows.map(p => ({ ...p, shopName: shopMap[p["shopId"] as string] ?? "" }));
}

const router = Router();
const A = requireRole("admin", "super_admin", "city_manager");

type SectionConfig = {
  categorySlug?: string;
  productIds?: string[];
  limit?: number;
  layout?: "grid" | "scroll";
};

const leanProductColumns = {
  id: products.id,
  name: products.name,
  price: products.price,
  discountedPrice: products.discountedPrice,
  unit: products.unit,
  images: products.images,
  stock: products.stock,
  rating: products.rating,
  shopId: products.shopId,
  category: products.category,
  subcategory: products.subcategory,
  trending: products.trending,
  status: products.status,
  colors: products.colors,
  sizes: products.sizes,
  colorImages: products.colorImages,
  fomoTag: products.fomoTag,
};

async function resolveProducts(
  type: string,
  config: SectionConfig,
  limit: number,
  offset = 0,
) {
  const lm = Math.min(limit, 40);
  const base = eq(products.status, "active");

  if (type === "trending") {
    const rows = await db.select(leanProductColumns).from(products)
      .where(and(base, eq(products.trending, true)))
      .orderBy(desc(products.rating), desc(products.createdAt))
      .limit(lm).offset(offset);
    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` })
      .from(products).where(and(base, eq(products.trending, true)));
    return { rows: await enrichWithShopNames(miArr(rows)), total: total ?? 0 };
  }

  if (type === "category" && config.categorySlug) {
    const slug = config.categorySlug.toLowerCase().trim();
    const rows = await db.select(leanProductColumns).from(products)
      .where(and(base, sql`LOWER(${products.category}) = ${slug} OR LOWER(${products.category}) LIKE ${`%${slug}%`}`))
      .orderBy(desc(products.rating), desc(products.createdAt))
      .limit(lm).offset(offset);
    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` })
      .from(products).where(and(base, sql`LOWER(${products.category}) = ${slug} OR LOWER(${products.category}) LIKE ${`%${slug}%`}`));
    return { rows: await enrichWithShopNames(miArr(rows)), total: total ?? 0 };
  }

  if (type === "manual" && Array.isArray(config.productIds) && config.productIds.length > 0) {
    const ids = config.productIds.slice(offset, offset + lm);
    if (ids.length === 0) return { rows: [], total: config.productIds.length };
    const rows = await db.select(leanProductColumns).from(products)
      .where(and(base, inArray(products.id, ids)));
    const rowMap = new Map(rows.map(r => [r.id, r]));
    const ordered = ids.map(id => rowMap.get(id)).filter(Boolean) as typeof rows;
    return { rows: await enrichWithShopNames(miArr(ordered)), total: config.productIds.length };
  }

  if (type === "new_arrivals") {
    const rows = await db.select(leanProductColumns).from(products)
      .where(base)
      .orderBy(desc(products.createdAt))
      .limit(lm).offset(offset);
    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` })
      .from(products).where(base);
    return { rows: await enrichWithShopNames(miArr(rows)), total: total ?? 0 };
  }

  // fallback: all active products
  const rows = await db.select(leanProductColumns).from(products)
    .where(base)
    .orderBy(desc(products.rating), desc(products.createdAt))
    .limit(lm).offset(offset);
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` })
    .from(products).where(base);
  return { rows: await enrichWithShopNames(miArr(rows)), total: total ?? 0 };
}

// GET /api/homepage-sections — public, enabled sections with first 8 products each
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  res.setHeader("Cache-Control", "public, s-maxage=180, stale-while-revalidate=360");
  // ── Cache check ──────────────────────────────────────────────────────────
  const cached = await cacheGet(KEYS.HOMEPAGE);
  if (cached) {
    res.json(cached);
    return;
  }

  const sections = await primaryDb.select().from(homepageSections)
    .where(eq(homepageSections.enabled, true))
    .orderBy(asc(homepageSections.sortOrder));

  const resolved = await Promise.all(sections.map(async (s) => {
    const cfg = (s.config ?? {}) as SectionConfig;
    const { rows, total } = await resolveProducts(s.type, cfg, 8, 0);
    return { ...mi(s), products: rows, total, hasMore: total > 8 };
  }));

  const payload = { success: true, sections: resolved };
  void cacheSet(KEYS.HOMEPAGE, payload, TTL.HOMEPAGE);
  res.json(payload);
});

// GET /api/homepage-sections/admin — admin, all sections (no product resolution)
router.get("/admin", optionalAuth, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sections = await primaryDb.select().from(homepageSections).orderBy(asc(homepageSections.sortOrder));
    res.json({ success: true, sections: miArr(sections) });
  } catch (err) {
    console.error("[homepage-sections] Error fetching admin sections:", err);
    res.status(500).json({ success: false, message: "Failed to load sections", error: String(err) });
  }
});

// GET /api/homepage-sections/:id/products — public, paginated products for one section
router.get("/:id/products", async (req: Request, res: Response): Promise<void> => {
  res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=240");
  const id = req.params["id"] as string;
  const page = Math.max(1, parseInt((req.query as Record<string, string>)["page"] ?? "1"));
  const limit = Math.min(40, parseInt((req.query as Record<string, string>)["limit"] ?? "8"));
  const offset = (page - 1) * limit;

  const [section] = await primaryDb.select().from(homepageSections)
    .where(eq(homepageSections.id, id)).limit(1);
  if (!section) { res.status(404).json({ success: false, message: "Section not found" }); return; }

  const cfg = (section.config ?? {}) as SectionConfig;
  const { rows, total } = await resolveProducts(section.type, cfg, limit, offset);
  const hasMore = offset + rows.length < total;

  res.json({ success: true, products: rows, total, page, hasMore });
});

// POST /api/homepage-sections — admin, create section
router.post("/", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const insertValues = {
      title: String(body["title"] ?? "New Section"),
      type: String(body["type"] ?? "trending"),
      enabled: body["enabled"] != null ? Boolean(body["enabled"]) : true,
      sortOrder: body["sortOrder"] != null ? Number(body["sortOrder"]) : 0,
      config: (body["config"] as object) ?? {},
    };
    const [section] = await primaryDb.insert(homepageSections).values(insertValues).returning();
    
    // Background sync to all replicas
    if (section) {
      void Promise.allSettled(
        replicaDbs.map(rDb => rDb.insert(homepageSections).values({ ...insertValues, id: section.id }).catch(() => {}))
      );
    }

    void cacheDel(KEYS.HOMEPAGE);
    res.status(201).json({ success: true, section: mi(section!) });
  } catch (err) {
    console.error("[homepage-sections] Error creating section:", err);
    res.status(500).json({ success: false, message: "Failed to create section", error: String(err) });
  }
});

// PATCH /api/homepage-sections/reorder — admin, batch update sort orders
router.patch("/reorder", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { order } = req.body as { order: Array<{ id: string; sortOrder: number }> };
    if (!Array.isArray(order)) { res.status(400).json({ success: false, message: "order must be an array" }); return; }
    await Promise.all(order.map(({ id, sortOrder }) =>
      primaryDb.update(homepageSections).set({ sortOrder }).where(eq(homepageSections.id, id))
    ));
    // Background sync to all replicas
    void Promise.allSettled(
      replicaDbs.map(rDb =>
        Promise.all(order.map(({ id, sortOrder }) =>
          rDb.update(homepageSections).set({ sortOrder }).where(eq(homepageSections.id, id)).catch(() => {})
        ))
      )
    );
    void cacheDel(KEYS.HOMEPAGE);
    res.json({ success: true });
  } catch (err) {
    console.error("[homepage-sections] Error reordering sections:", err);
    res.status(500).json({ success: false, message: "Failed to reorder sections", error: String(err) });
  }
});

// PATCH /api/homepage-sections/:id — admin, update section
router.patch("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    if ("title" in body) updates["title"] = String(body["title"]);
    if ("type" in body) updates["type"] = String(body["type"]);
    if ("enabled" in body) updates["enabled"] = Boolean(body["enabled"]);
    if ("sortOrder" in body) updates["sortOrder"] = Number(body["sortOrder"]);
    if ("config" in body) updates["config"] = body["config"] as object;
    updates["updatedAt"] = new Date();

    const id = req.params["id"] as string;
    const [section] = await primaryDb.update(homepageSections)
      .set(updates)
      .where(eq(homepageSections.id, id))
      .returning();
    if (!section) { res.status(404).json({ success: false, message: "Section not found" }); return; }

    // Background sync to all replicas
    void Promise.allSettled(
      replicaDbs.map(rDb => rDb.update(homepageSections).set(updates).where(eq(homepageSections.id, id)).catch(() => {}))
    );

    void cacheDel(KEYS.HOMEPAGE);
    res.json({ success: true, section: mi(section) });
  } catch (err) {
    console.error("[homepage-sections] Error updating section:", err);
    res.status(500).json({ success: false, message: "Failed to update section", error: String(err) });
  }
});

// DELETE /api/homepage-sections/:id — admin, delete section
router.delete("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params["id"] as string;
    await primaryDb.delete(homepageSections).where(eq(homepageSections.id, id));
    // Background sync to all replicas
    void Promise.allSettled(
      replicaDbs.map(rDb => rDb.delete(homepageSections).where(eq(homepageSections.id, id)).catch(() => {}))
    );
    void cacheDel(KEYS.HOMEPAGE);
    res.json({ success: true, message: "Section deleted" });
  } catch (err) {
    console.error("[homepage-sections] Error deleting section:", err);
    res.status(500).json({ success: false, message: "Failed to delete section", error: String(err) });
  }
});

export default router;
