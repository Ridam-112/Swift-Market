import { Router, type Response } from "express";
import { db, payouts, shops, orders } from "@workspace/db";
import { eq, and, inArray, desc, or, sql } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { mi, miArr } from "../../utils/mapId.js";

const router = Router();
const A = requireRole("admin", "super_admin");

// Helper to compute default 3-day scheduled date from created date
function getScheduledDate(createdAt: Date, scheduledDate?: Date | null): Date {
  if (scheduledDate) return new Date(scheduledDate);
  return new Date(new Date(createdAt).getTime() + 3 * 24 * 60 * 60 * 1000);
}

// GET /api/payouts — admin: see all payouts with full details
router.get("/", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, earlyRequested, shopId } = req.query as { status?: string; earlyRequested?: string; shopId?: string };
  const conditions = [];

  if (status && status !== "all") {
    conditions.push(eq(payouts.status, status));
  }
  if (earlyRequested === "true") {
    conditions.push(eq(payouts.earlyPayoutRequested, true));
  }
  if (shopId) {
    conditions.push(eq(payouts.shopId, shopId));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db.select().from(payouts).where(where).orderBy(desc(payouts.createdAt));

  const enriched = rows.map(r => ({
    ...r,
    scheduledDate: getScheduledDate(r.createdAt, r.scheduledDate),
  }));

  res.json({ success: true, payouts: miArr(enriched) });
});

// GET /api/payouts/my — vendor: see payouts for their own shops only
router.get("/my", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { status } = req.query as { status?: string };

  // Resolve all shops owned by this vendor
  const vendorShops = await db.select({ id: shops.id, shopName: shops.shopName }).from(shops).where(eq(shops.ownerId, req.user!.userId));
  if (vendorShops.length === 0) {
    res.json({ success: true, payouts: [], totalEarned: 0, pendingAmount: 0, nextScheduledDate: null });
    return;
  }

  const shopIds = vendorShops.map(s => s.id);
  const conditions = [inArray(payouts.shopId, shopIds)];
  if (status && status !== "all") conditions.push(eq(payouts.status, status));

  const rows = await db.select().from(payouts).where(and(...conditions)).orderBy(desc(payouts.createdAt));
  const totalEarned = rows.filter(r => r.status === "paid").reduce((s, r) => s + (r.amount ?? 0), 0);
  const pendingAmount = rows.filter(r => r.status === "pending" || r.status === "processing").reduce((s, r) => s + (r.amount ?? 0), 0);

  const enriched = rows.map(r => ({
    ...r,
    scheduledDate: getScheduledDate(r.createdAt, r.scheduledDate),
  }));

  // Find earliest pending scheduled date
  const pendingRows = enriched.filter(r => r.status === "pending" && r.scheduledDate);
  pendingRows.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  const nextScheduledDate = pendingRows.length > 0 ? pendingRows[0].scheduledDate : null;

  res.json({
    success: true,
    payouts: miArr(enriched),
    totalEarned,
    pendingAmount,
    nextScheduledDate,
  });
});

// POST /api/payouts/mark-all-paid — Admin: Mark all past/pending payouts as paid
router.post("/mark-all-paid", authenticate, A, async (_req: AuthRequest, res: Response): Promise<void> => {
  const result = await db.update(payouts)
    .set({
      status: "paid",
      paidAt: new Date(),
      earlyPayoutRequested: false,
      updatedAt: new Date(),
    })
    .where(or(eq(payouts.status, "pending"), eq(payouts.status, "processing")))
    .returning();

  res.json({
    success: true,
    message: `Marked ${result.length} payouts as paid.`,
    updatedCount: result.length,
  });
});

// POST /api/payouts/request-early — Vendor: Request early payout
router.post("/request-early", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { payoutId, reason } = req.body as { payoutId?: string; reason?: string };

  const vendorShops = await db.select({ id: shops.id }).from(shops).where(eq(shops.ownerId, req.user!.userId));
  if (vendorShops.length === 0) {
    res.status(403).json({ success: false, message: "No shop registered for this vendor" });
    return;
  }
  const shopIds = vendorShops.map(s => s.id);

  if (payoutId) {
    const [existing] = await db.select().from(payouts).where(and(eq(payouts.id, payoutId), inArray(payouts.shopId, shopIds))).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, message: "Payout record not found" });
      return;
    }
    const [updated] = await db.update(payouts)
      .set({
        earlyPayoutRequested: true,
        earlyPayoutRequestedAt: new Date(),
        earlyPayoutReason: reason || "Vendor requested instant early payout",
        updatedAt: new Date(),
      })
      .where(eq(payouts.id, payoutId))
      .returning();

    res.json({ success: true, message: "Early payout request submitted to admin for review", payout: mi(updated) });
    return;
  }

  // If no specific payoutId given, mark all pending payouts for vendor's shops as early requested
  const updatedList = await db.update(payouts)
    .set({
      earlyPayoutRequested: true,
      earlyPayoutRequestedAt: new Date(),
      earlyPayoutReason: reason || "Vendor requested instant early payout",
      updatedAt: new Date(),
    })
    .where(and(inArray(payouts.shopId, shopIds), eq(payouts.status, "pending")))
    .returning();

  res.json({
    success: true,
    message: `Early payout request for ${updatedList.length} records submitted to admin for review`,
    count: updatedList.length,
  });
});

// PATCH /api/payouts/:id — Admin: Edit amount (adjustment for wrong products / deductions), scheduled date, status, notes
router.patch("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const { amount, deductionAmount, adjustedReason, scheduledDate, status, notes, earlyPayoutRequested } = req.body as {
    amount?: number;
    deductionAmount?: number;
    adjustedReason?: string;
    scheduledDate?: string;
    status?: string;
    notes?: string;
    earlyPayoutRequested?: boolean;
  };

  const updatePayload: Record<string, unknown> = { updatedAt: new Date() };

  if (typeof amount === "number") updatePayload["amount"] = amount;
  if (typeof deductionAmount === "number") updatePayload["deductionAmount"] = deductionAmount;
  if (typeof adjustedReason === "string") updatePayload["adjustedReason"] = adjustedReason;
  if (scheduledDate) updatePayload["scheduledDate"] = new Date(scheduledDate);
  if (status) {
    updatePayload["status"] = status;
    if (status === "paid") {
      updatePayload["paidAt"] = new Date();
      updatePayload["earlyPayoutRequested"] = false;
    }
  }
  if (notes !== undefined) updatePayload["notes"] = notes;
  if (earlyPayoutRequested !== undefined) updatePayload["earlyPayoutRequested"] = earlyPayoutRequested;

  const [payout] = await db.update(payouts)
    .set(updatePayload)
    .where(eq(payouts.id, req.params["id"] as string))
    .returning();

  if (!payout) {
    res.status(404).json({ success: false, message: "Payout not found" });
    return;
  }

  res.json({
    success: true,
    payout: mi({
      ...payout,
      scheduledDate: getScheduledDate(payout.createdAt, payout.scheduledDate),
    }),
  });
});

// PATCH /api/payouts/:id/status — Admin status update compatibility
router.patch("/:id/status", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, notes } = req.body as { status: string; notes?: string };
  const updatePayload: Record<string, unknown> = { status, notes, updatedAt: new Date() };
  if (status === "paid") {
    updatePayload["paidAt"] = new Date();
    updatePayload["earlyPayoutRequested"] = false;
  }
  const [payout] = await db.update(payouts)
    .set(updatePayload)
    .where(eq(payouts.id, req.params["id"] as string))
    .returning();
  if (!payout) { res.status(404).json({ success: false, message: "Not found" }); return; }
  res.json({
    success: true,
    payout: mi({
      ...payout,
      scheduledDate: getScheduledDate(payout.createdAt, payout.scheduledDate),
    }),
  });
});

export default router;
