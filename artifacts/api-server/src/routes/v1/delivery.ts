import { Router, type Response } from "express";
import { db, deliveryPartners } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { mi, miArr } from "../../utils/mapId.js";

const router = Router();
const A = requireRole("admin", "super_admin");

router.get("/", authenticate, A, async (_req, res: Response): Promise<void> => {
  const partners = await db.select().from(deliveryPartners).orderBy(desc(deliveryPartners.createdAt));
  res.json({ success: true, partners: miArr(partners) });
});

router.post("/", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const [partner] = await db.insert(deliveryPartners).values({
    name: String(body["name"] ?? ""),
    phone: String(body["phone"] ?? ""),
    userId: body["userId"] ? String(body["userId"]) : undefined,
    vehicle: body["vehicle"] ? String(body["vehicle"]) : undefined,
    isAvailable: body["isAvailable"] != null ? Boolean(body["isAvailable"]) : true,
    status: body["status"] ? String(body["status"]) : "active",
  }).returning();
  res.status(201).json({ success: true, partner: mi(partner!) });
});

router.patch("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const [partner] = await db.update(deliveryPartners)
    .set(req.body as Record<string, unknown>)
    .where(eq(deliveryPartners.id, req.params["id"]!))
    .returning();
  if (!partner) { res.status(404).json({ success: false, message: "Not found" }); return; }
  res.json({ success: true, partner: mi(partner) });
});

router.delete("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  await db.delete(deliveryPartners).where(eq(deliveryPartners.id, req.params["id"]!));
  res.json({ success: true, message: "Deleted" });
});

export default router;
