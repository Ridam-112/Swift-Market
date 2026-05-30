import { Router, type Response } from "express";
import { CommissionRule } from "../../models/CommissionRule.js";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";

const router = Router();
const A = requireRole("admin", "super_admin");

router.get("/", authenticate, A, async (_req, res: Response): Promise<void> => {
  const rules = await CommissionRule.find().sort({ level: 1 });
  res.json({ success: true, rules });
});

router.post("/", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const rule = await CommissionRule.create(req.body as Record<string, unknown>);
  res.status(201).json({ success: true, rule });
});

router.patch("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const rule = await CommissionRule.findByIdAndUpdate(req.params["id"], req.body as Record<string, unknown>, { new: true });
  if (!rule) { res.status(404).json({ success: false, message: "Not found" }); return; }
  res.json({ success: true, rule });
});

router.delete("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  await CommissionRule.findByIdAndDelete(req.params["id"]);
  res.json({ success: true, message: "Deleted" });
});

export default router;
