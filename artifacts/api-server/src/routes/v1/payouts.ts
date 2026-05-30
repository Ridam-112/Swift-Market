import { Router, type Response } from "express";
import { Payout } from "../../models/Payout.js";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";

const router = Router();
const A = requireRole("admin", "super_admin");

router.get("/", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const { status } = req.query as { status?: string };
  const filter = status ? { status } : {};
  const payouts = await Payout.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, payouts });
});

router.patch("/:id/status", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, notes } = req.body as { status: string; notes?: string };
  const update: Record<string, unknown> = { status, notes };
  if (status === "paid") update["paidAt"] = new Date();
  const payout = await Payout.findByIdAndUpdate(req.params["id"], update, { new: true });
  if (!payout) { res.status(404).json({ success: false, message: "Not found" }); return; }
  res.json({ success: true, payout });
});

export default router;
