import { Router, type Response } from "express";
import { DeliveryPartner } from "../../models/DeliveryPartner.js";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";

const router = Router();
const A = requireRole("admin", "super_admin");

router.get("/", authenticate, A, async (_req, res: Response): Promise<void> => {
  const partners = await DeliveryPartner.find().sort({ createdAt: -1 });
  res.json({ success: true, partners });
});

router.post("/", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const partner = await DeliveryPartner.create(req.body as Record<string, unknown>);
  res.status(201).json({ success: true, partner });
});

router.patch("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const partner = await DeliveryPartner.findByIdAndUpdate(req.params["id"], req.body as Record<string, unknown>, { new: true });
  if (!partner) { res.status(404).json({ success: false, message: "Not found" }); return; }
  res.json({ success: true, partner });
});

router.delete("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  await DeliveryPartner.findByIdAndDelete(req.params["id"]);
  res.json({ success: true, message: "Deleted" });
});

export default router;
