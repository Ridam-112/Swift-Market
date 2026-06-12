import { Router, type Response } from "express";
import { db, users } from "@workspace/db";
import { eq, and, ilike, or, count, desc } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { mi, miArr } from "../../utils/mapId.js";

const router = Router();
const A = requireRole("admin", "super_admin");

// GET /api/users
router.get("/", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const { role, status, search, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pg = parseInt(page), lm = parseInt(limit);
  const conditions = [];
  if (role) conditions.push(eq(users.role, role));
  if (status) conditions.push(eq(users.status, status));
  if (search) conditions.push(or(ilike(users.name, `%${search}%`), ilike(users.phone, `%${search}%`))!);
  const where = conditions.length ? and(...conditions) : undefined;
  const skip = (pg - 1) * lm;
  const [result, [{ total }]] = await Promise.all([
    db.select().from(users).where(where).orderBy(desc(users.createdAt)).offset(skip).limit(lm),
    db.select({ total: count() }).from(users).where(where),
  ]);
  res.json({ success: true, users: miArr(result), total: Number(total), page: pg, pages: Math.ceil(Number(total) / lm) });
});

// PATCH /api/users/:id/ban
router.patch("/:id/ban", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const [user] = await db.update(users).set({ status: "banned" }).where(eq(users.id, req.params["id"] as string)).returning();
  if (!user) { res.status(404).json({ success: false, message: "User not found" }); return; }
  res.json({ success: true, user: mi(user) });
});

// PATCH /api/users/:id/unban
router.patch("/:id/unban", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const [user] = await db.update(users).set({ status: "active" }).where(eq(users.id, req.params["id"] as string)).returning();
  if (!user) { res.status(404).json({ success: false, message: "User not found" }); return; }
  res.json({ success: true, user: mi(user) });
});

// GET /api/users/me/profile
router.get("/me/profile", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const [user] = await db.select().from(users).where(eq(users.id, req.user!.userId)).limit(1);
  if (!user) { res.status(404).json({ success: false, message: "Not found" }); return; }
  res.json({ success: true, user: mi(user) });
});

// PATCH /api/users/me/profile
router.patch("/me/profile", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const update: Record<string, unknown> = {};
  for (const key of ["name", "email", "addresses", "pincode"] as const) {
    if (body[key] !== undefined) update[key] = body[key];
  }
  const [user] = await db.update(users).set(update).where(eq(users.id, req.user!.userId)).returning();
  if (!user) { res.status(404).json({ success: false, message: "Not found" }); return; }
  res.json({ success: true, user: mi(user) });
});

export default router;
