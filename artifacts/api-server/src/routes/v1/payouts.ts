import { Router, type Response } from "express";
import { db, payouts } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { mi, miArr } from "../../utils/mapId.js";

const router = Router();
const A = requireRole("admin", "super_admin");

router.get("/", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const { status } = req.query as { status?: string };
  const where = status ? eq(payouts.status, status) : undefined;
  const rows = await db.select().from(payouts).where(where).orderBy(desc(payouts.createdAt));
  res.json({ success: true, payouts: miArr(rows) });
});

router.patch("/:id/status", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, notes } = req.body as { status: string; notes?: string };
  const updatePayload: Record<string, unknown> = { status, notes };
  if (status === "paid") updatePayload["paidAt"] = new Date();
  const [payout] = await db.update(payouts)
    .set(updatePayload)
    .where(eq(payouts.id, req.params["id"]!))
    .returning();
  if (!payout) { res.status(404).json({ success: false, message: "Not found" }); return; }
  res.json({ success: true, payout: mi(payout) });
});

export default router;
