import { Router, type Request, type Response } from "express";
import { db, homepageSections, products } from "@workspace/db";
import { eq, inArray, asc, and, gt, desc } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { mi, miArr } from "../../utils/mapId.js";

const router = Router();
const A = requireRole("admin", "super_admin");

type SectionConfig = {
  categorySlug?: string;
  productIds?: string[];
  limit?: number;
  layout?: "grid" | "scroll";
};

async function resolveProducts(type: string, config: SectionConfig, limit: number) {
  const lm = Math.min(limit, 40);
  const base = and(eq(products.status, "active"), gt(products.stock, 0));

  if (type === "trending") {
    const rows = await db.select().from(products)
      .where(and(base, eq(products.trending, true)))
      .orderBy(desc(products.rating))
      .limit(lm);
    return miArr(rows);
  }

  if (type === "category" && config.categorySlug) {
    const rows = await db.select().from(products)
      .where(and(base, eq(products.category, config.categorySlug)))
      .orderBy(desc(products.rating))
      .limit(lm);
    return miArr(rows);
  }

  if (type === "manual" && Array.isArray(config.productIds) && config.productIds.length > 0) {
    const rows = await db.select().from(products)
      .where(and(base, inArray(products.id, config.productIds.slice(0, 40))))
      .limit(lm);
    return miArr(rows);
  }

  if (type === "new_arrivals") {
    const rows = await db.select().from(products)
      .where(base)
      .orderBy(desc(products.createdAt))
      .limit(lm);
    return miArr(rows);
  }

  const rows = await db.select().from(products)
    .where(base)
    .orderBy(desc(products.rating))
    .limit(lm);
  return miArr(rows);
}

// GET /api/homepage-sections — public, enabled sections with resolved products
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  const sections = await db.select().from(homepageSections)
    .where(eq(homepageSections.enabled, true))
    .orderBy(asc(homepageSections.sortOrder));

  const resolved = await Promise.all(sections.map(async (s) => {
    const cfg = (s.config ?? {}) as SectionConfig;
    const limit = cfg.limit ?? 10;
    const prods = await resolveProducts(s.type, cfg, limit);
    return {
      ...mi(s),
      products: prods,
    };
  }));

  res.json({ success: true, sections: resolved });
});

// GET /api/homepage-sections/admin — admin, all sections (no product resolution)
router.get("/admin", authenticate, A, async (_req: AuthRequest, res: Response): Promise<void> => {
  const sections = await db.select().from(homepageSections).orderBy(asc(homepageSections.sortOrder));
  res.json({ success: true, sections: miArr(sections) });
});

// POST /api/homepage-sections — admin, create section
router.post("/", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const [section] = await db.insert(homepageSections).values({
    title: String(body["title"] ?? "New Section"),
    type: String(body["type"] ?? "trending"),
    enabled: body["enabled"] != null ? Boolean(body["enabled"]) : true,
    sortOrder: body["sortOrder"] != null ? Number(body["sortOrder"]) : 0,
    config: (body["config"] as object) ?? {},
  }).returning();
  res.status(201).json({ success: true, section: mi(section!) });
});

// PATCH /api/homepage-sections/reorder — admin, batch update sort orders
router.patch("/reorder", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const { order } = req.body as { order: Array<{ id: string; sortOrder: number }> };
  if (!Array.isArray(order)) { res.status(400).json({ success: false, message: "order must be an array" }); return; }
  await Promise.all(order.map(({ id, sortOrder }) =>
    db.update(homepageSections).set({ sortOrder }).where(eq(homepageSections.id, id))
  ));
  res.json({ success: true });
});

// PATCH /api/homepage-sections/:id — admin, update section
router.patch("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const updates: Record<string, unknown> = {};
  if ("title" in body) updates["title"] = String(body["title"]);
  if ("type" in body) updates["type"] = String(body["type"]);
  if ("enabled" in body) updates["enabled"] = Boolean(body["enabled"]);
  if ("sortOrder" in body) updates["sortOrder"] = Number(body["sortOrder"]);
  if ("config" in body) updates["config"] = body["config"] as object;
  updates["updatedAt"] = new Date();

  const [section] = await db.update(homepageSections)
    .set(updates)
    .where(eq(homepageSections.id, req.params["id"] as string))
    .returning();
  if (!section) { res.status(404).json({ success: false, message: "Section not found" }); return; }
  res.json({ success: true, section: mi(section) });
});

// DELETE /api/homepage-sections/:id — admin, delete section
router.delete("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  await db.delete(homepageSections).where(eq(homepageSections.id, req.params["id"] as string));
  res.json({ success: true, message: "Section deleted" });
});

export default router;
