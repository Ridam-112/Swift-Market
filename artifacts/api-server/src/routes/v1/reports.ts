import { Router, type Response } from "express";
import { Report } from "../../models/Report.js";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";

const router = Router();
const A = requireRole("admin", "super_admin");

router.get("/", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const { status } = req.query as { status?: string };
  const filter = status ? { status } : {};
  const reports = await Report.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, reports });
});

router.post("/", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const report = await Report.create({
    ...body,
    reportedBy: req.user!.userId,
    reporterPhone: req.user!.phone,
    status: "open",
  });
  res.status(201).json({ success: true, report });
});

router.patch("/:id/resolve", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const report = await Report.findByIdAndUpdate(
    req.params["id"],
    { status: "resolved", resolvedBy: req.user!.userId },
    { new: true }
  );
  if (!report) { res.status(404).json({ success: false, message: "Not found" }); return; }
  res.json({ success: true, report });
});

router.patch("/:id/ignore", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const report = await Report.findByIdAndUpdate(
    req.params["id"],
    { status: "ignored", resolvedBy: req.user!.userId },
    { new: true }
  );
  if (!report) { res.status(404).json({ success: false, message: "Not found" }); return; }
  res.json({ success: true, report });
});

export default router;
