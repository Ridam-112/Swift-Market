import { Router, type Request, type Response } from "express";
import { db, shopTypes } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { mi, miArr } from "../../utils/mapId.js";

const router = Router();
const A = requireRole("admin", "super_admin");

// ── In-memory cache for shop type lists ───────────────────────────────────────
// Shop types are admin-managed and virtually never change during normal
// operation. Caching both lists for 60 minutes eliminates repeated Neon
// queries on every vendor registration page and shop browse flow.
const SHOP_TYPE_TTL_MS = 60 * 60 * 1000; // 60 minutes
let _allCache:    { data: unknown; expiresAt: number } | null = null;
let _activeCache: { data: unknown; expiresAt: number } | null = null;

function getShopTypeCache(cache: typeof _allCache): unknown | null {
  if (cache && Date.now() < cache.expiresAt) return cache.data;
  return null;
}
function invalidateShopTypeCache(): void {
  _allCache = null;
  _activeCache = null;
}

router.get("/", async (_req: Request, res: Response): Promise<void> => {
  const hit = getShopTypeCache(_allCache);
  if (hit) { res.json(hit); return; }
  const types = await db.select().from(shopTypes).orderBy(asc(shopTypes.name));
  const payload = { success: true, shopTypes: miArr(types) };
  _allCache = { data: payload, expiresAt: Date.now() + SHOP_TYPE_TTL_MS };
  res.json(payload);
});

router.get("/active", async (_req: Request, res: Response): Promise<void> => {
  const hit = getShopTypeCache(_activeCache);
  if (hit) { res.json(hit); return; }
  const types = await db.select().from(shopTypes).where(eq(shopTypes.isActive, true)).orderBy(asc(shopTypes.name));
  const payload = { success: true, shopTypes: miArr(types) };
  _activeCache = { data: payload, expiresAt: Date.now() + SHOP_TYPE_TTL_MS };
  res.json(payload);
});

router.post("/", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, commissionRate } = req.body as { name: string; commissionRate?: number };
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const [st] = await db.insert(shopTypes).values({ name, slug, commissionRate, isActive: true }).returning();
  invalidateShopTypeCache();
  res.status(201).json({ success: true, shopType: mi(st) });
});

router.patch("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const [st] = await db.update(shopTypes).set(req.body as Record<string, unknown>).where(eq(shopTypes.id, req.params["id"] as string)).returning();
  if (!st) { res.status(404).json({ success: false, message: "Not found" }); return; }
  invalidateShopTypeCache();
  res.json({ success: true, shopType: mi(st) });
});

router.delete("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  await db.delete(shopTypes).where(eq(shopTypes.id, req.params["id"] as string));
  invalidateShopTypeCache();
  res.json({ success: true, message: "Deleted" });
});

export default router;
