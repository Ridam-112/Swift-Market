import { Router, type Request, type Response } from "express";
import { db, heroBanners } from "@workspace/db";
import { eq, inArray, asc, sql } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { deleteFromImageKit } from "../../lib/imagekit.js";
import { mi, miArr } from "../../utils/mapId.js";

// Bug #12 fix: simple in-memory rate limiter — 1 view/click per IP per banner per hour
const viewedRecently = new Set<string>();
const clickedRecently = new Set<string>();
function scheduleCleanup(set: Set<string>, key: string, ttlMs: number) {
  setTimeout(() => set.delete(key), ttlMs);
}

// ── In-memory cache for public banner list ────────────────────────────────────
// Banners change only when an admin creates/updates/deletes one. Caching the
// public GET response for 15 minutes eliminates a full DB round-trip on every
// page load. Any write operation below calls invalidateBannerCache().
const BANNER_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
let _bannerCache: { data: unknown; expiresAt: number } | null = null;

function getBannerCache(): unknown | null {
  if (_bannerCache && Date.now() < _bannerCache.expiresAt) return _bannerCache.data;
  _bannerCache = null;
  return null;
}
function setBannerCache(data: unknown): void {
  _bannerCache = { data, expiresAt: Date.now() + BANNER_CACHE_TTL_MS };
}
function invalidateBannerCache(): void {
  _bannerCache = null;
}

const router = Router();
const A = requireRole("admin", "super_admin");

// GET /api/hero-banners — public, active banners sorted by displayOrder
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  const hit = getBannerCache();
  if (hit) { res.json(hit); return; }
  const banners = await db.select().from(heroBanners).where(eq(heroBanners.isActive, true)).orderBy(asc(heroBanners.displayOrder));
  const payload = { success: true, banners: miArr(banners) };
  setBannerCache(payload);
  res.json(payload);
});

// GET /api/hero-banners/admin — admin, all banners with analytics totals
router.get("/admin", authenticate, A, async (_req: AuthRequest, res: Response): Promise<void> => {
  const banners = await db.select().from(heroBanners).orderBy(asc(heroBanners.displayOrder));
  const totalViews = banners.reduce((s, b) => s + b.views, 0);
  const totalClicks = banners.reduce((s, b) => s + b.clicks, 0);
  res.json({ success: true, banners: miArr(banners), totalViews, totalClicks });
});

// POST /api/hero-banners — admin, create banner
router.post("/", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const [banner] = await db.insert(heroBanners).values({
    imageUrl: String(body["imageUrl"] ?? ""),
    title: body["title"] ? String(body["title"]) : undefined,
    subtitle: body["subtitle"] ? String(body["subtitle"]) : undefined,
    buttonText: body["buttonText"] ? String(body["buttonText"]) : undefined,
    redirectType: body["redirectType"] ? String(body["redirectType"]) : undefined,
    redirectValue: body["redirectValue"] ? String(body["redirectValue"]) : undefined,
    accentColor: body["accentColor"] ? String(body["accentColor"]) : undefined,
    isActive: body["isActive"] != null ? Boolean(body["isActive"]) : true,
    displayOrder: body["displayOrder"] != null ? Number(body["displayOrder"]) : 0,
  }).returning();
  invalidateBannerCache();
  res.status(201).json({ success: true, banner: mi(banner!) });
});

// POST /api/hero-banners/batch-view — public, rate-limited to 1 view per IP per banner per hour
router.post("/batch-view", async (req: Request, res: Response): Promise<void> => {
  const { ids } = req.body as { ids?: string[] };
  if (!Array.isArray(ids) || ids.length === 0) { res.json({ success: true }); return; }
  const ip = req.ip ?? "unknown";
  const TTL = 60 * 60 * 1000;
  const newIds = ids.filter(id => {
    const key = `${ip}:${id}`;
    if (viewedRecently.has(key)) return false;
    viewedRecently.add(key);
    scheduleCleanup(viewedRecently, key, TTL);
    return true;
  });
  if (newIds.length > 0) {
    await db.update(heroBanners)
      .set({ views: sql`${heroBanners.views} + 1` })
      .where(inArray(heroBanners.id, newIds));
  }
  res.json({ success: true });
});

// POST /api/hero-banners/:id/click — public, rate-limited to 1 click per IP per banner per hour
router.post("/:id/click", async (req: Request, res: Response): Promise<void> => {
  const id = req.params["id"] as string;
  const ip = req.ip ?? "unknown";
  const key = `${ip}:${id}`;
  if (!clickedRecently.has(key)) {
    clickedRecently.add(key);
    scheduleCleanup(clickedRecently, key, 60 * 60 * 1000);
    await db.update(heroBanners)
      .set({ clicks: sql`${heroBanners.clicks} + 1` })
      .where(eq(heroBanners.id, id));
  }
  res.json({ success: true });
});

// PATCH /api/hero-banners/:id — admin, update banner
router.patch("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const [oldBanner] = await db.select({ imageUrl: heroBanners.imageUrl })
    .from(heroBanners).where(eq(heroBanners.id, req.params["id"] as string)).limit(1);

  // Sanitise properties
  const updates: Record<string, any> = { updatedAt: new Date() };
  if ("imageUrl" in body) updates.imageUrl = String(body["imageUrl"]);
  if ("title" in body) updates.title = body["title"] ? String(body["title"]) : null;
  if ("subtitle" in body) updates.subtitle = body["subtitle"] ? String(body["subtitle"]) : null;
  if ("buttonText" in body) updates.buttonText = body["buttonText"] ? String(body["buttonText"]) : null;
  if ("redirectType" in body) updates.redirectType = body["redirectType"] ? String(body["redirectType"]) : null;
  if ("redirectValue" in body) updates.redirectValue = body["redirectValue"] ? String(body["redirectValue"]) : null;
  if ("accentColor" in body) updates.accentColor = body["accentColor"] ? String(body["accentColor"]) : null;
  if ("isActive" in body) updates.isActive = Boolean(body["isActive"]);
  if ("displayOrder" in body) updates.displayOrder = Number(body["displayOrder"]);

  const [banner] = await db.update(heroBanners)
    .set(updates)
    .where(eq(heroBanners.id, req.params["id"] as string))
    .returning();
  if (!banner) { res.status(404).json({ success: false, message: "Banner not found" }); return; }

  // Delete old Cloudinary/ImageKit image if imageUrl was replaced
  if (oldBanner?.imageUrl && "imageUrl" in body && body["imageUrl"] !== oldBanner.imageUrl) {
    void deleteFromImageKit(oldBanner.imageUrl);
  }

  invalidateBannerCache();
  res.json({ success: true, banner: mi(banner) });
});

// DELETE /api/hero-banners/:id — admin, delete banner + Cloudinary cleanup
router.delete("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const [banner] = await db.select({ imageUrl: heroBanners.imageUrl })
    .from(heroBanners)
    .where(eq(heroBanners.id, req.params["id"] as string))
    .limit(1);
  // Delete from DB first — Cloudinary cleanup is non-blocking so a CDN failure never orphans the DB record
  await db.delete(heroBanners).where(eq(heroBanners.id, req.params["id"] as string));
  invalidateBannerCache();
  if (banner?.imageUrl) {
    deleteFromImageKit(banner.imageUrl).catch(() => {});
  }
  res.json({ success: true, message: "Banner deleted" });
});

export default router;
