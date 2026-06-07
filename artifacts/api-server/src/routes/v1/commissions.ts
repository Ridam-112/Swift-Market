import { Router, type Response } from "express";
import { db, commissionRules } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { mi, miArr } from "../../utils/mapId.js";

const router = Router();
const A = requireRole("admin", "super_admin");

router.get("/", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const conditions = [];
  if (req.query["level"]) conditions.push(eq(commissionRules.level, String(req.query["level"])));
  if (req.query["targetId"]) conditions.push(eq(commissionRules.targetId, String(req.query["targetId"])));
  const where = conditions.length ? and(...conditions) : undefined;
  const rules = await db.select().from(commissionRules).where(where).orderBy(asc(commissionRules.level));
  res.json({ success: true, rules: miArr(rules) });
});

router.post("/", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const [rule] = await db.insert(commissionRules).values({
    level: String(body["level"] ?? ""),
    type: body["type"] ? String(body["type"]) : "percentage",
    targetId: body["targetId"] ? String(body["targetId"]) : undefined,
    targetName: body["targetName"] ? String(body["targetName"]) : undefined,
    rate: body["rate"] != null ? Number(body["rate"]) : 5,
    isActive: body["isActive"] != null ? Boolean(body["isActive"]) : true,
  }).returning();
  res.status(201).json({ success: true, rule: mi(rule!) });
});

router.patch("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const [rule] = await db.update(commissionRules)
    .set(req.body as Record<string, unknown>)
    .where(eq(commissionRules.id, req.params["id"]!))
    .returning();
  if (!rule) { res.status(404).json({ success: false, message: "Not found" }); return; }
  res.json({ success: true, rule: mi(rule) });
});

router.delete("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  await db.delete(commissionRules).where(eq(commissionRules.id, req.params["id"]!));
  res.json({ success: true, message: "Deleted" });
});

export default router;
