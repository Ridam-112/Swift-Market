import { Router, type Response } from "express";
import { db, deliveryPartners, users } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { validateUuidParams } from "../../middlewares/validateUuid.js";
import { mi, miArr } from "../../utils/mapId.js";

const router = Router();
const A = requireRole("admin", "super_admin");

/**
 * ─── ADMIN RIDER MANAGEMENT ROUTES ───────────────────────────────────────────
 * Mounted at: /api/admin/riders
 */

// GET /api/admin/riders/applications — Section 5.2: list rider applications (pending by default)
router.get("/applications", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const statusParam = (req.query["status"] as string | undefined) ?? "pending";
  const rows = await db
    .select()
    .from(deliveryPartners)
    .where(eq(deliveryPartners.applicationStatus, statusParam))
    .orderBy(desc(deliveryPartners.createdAt));

  res.json({ success: true, applications: miArr(rows) });
});

// POST /api/admin/riders/:id/approve — Section 5.2: approve rider application
router.post("/:id/approve", authenticate, A, validateUuidParams("id"), async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params["id"] as string;
  const [updated] = await db
    .update(deliveryPartners)
    .set({
      applicationStatus: "approved",
      status: "active",
      isAvailable: true,
      updatedAt: new Date(),
    })
    .where(eq(deliveryPartners.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ success: false, message: "Rider partner application not found" });
    return;
  }

  // Auto-link user and grant rider role upon admin approval
  let targetUserId = updated.userId;
  if (!targetUserId && updated.phone) {
    const [userRow] = await db.select({ id: users.id }).from(users).where(eq(users.phone, updated.phone)).limit(1);
    if (userRow) {
      targetUserId = userRow.id;
      await db.update(deliveryPartners).set({ userId: targetUserId }).where(eq(deliveryPartners.id, updated.id));
    }
  }

  if (targetUserId) {
    const [userRow] = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
    if (userRow) {
      await db.update(users).set({
        role: "rider",
        updatedAt: new Date(),
      }).where(eq(users.id, targetUserId));
    }
  }

  res.json({
    success: true,
    message: `Rider '${updated.name}' application approved successfully`,
    partner: mi(updated),
  });
});

// POST /api/admin/riders/:id/reject — Section 5.2: reject rider application
router.post("/:id/reject", authenticate, A, validateUuidParams("id"), async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params["id"] as string;
  const { reason } = req.body as { reason?: string };

  const [updated] = await db
    .update(deliveryPartners)
    .set({
      applicationStatus: "rejected",
      status: "inactive",
      rejectionReason: reason ?? "Application rejected by admin",
      updatedAt: new Date(),
    })
    .where(eq(deliveryPartners.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ success: false, message: "Rider partner application not found" });
    return;
  }

  res.json({
    success: true,
    message: `Rider '${updated.name}' application rejected`,
    partner: mi(updated),
  });
});

// GET /api/admin/riders/live-location (and live-locations) — returns rider table's live location info
const getLiveLocationsHandler = async (_req: AuthRequest, res: Response): Promise<void> => {
  const rows = await db
    .select({
      id: deliveryPartners.id,
      name: deliveryPartners.name,
      phone: deliveryPartners.phone,
      vehicle: deliveryPartners.vehicle,
      status: deliveryPartners.status,
      isAvailable: deliveryPartners.isAvailable,
      currentLat: deliveryPartners.currentLat,
      currentLon: deliveryPartners.currentLon,
      currentOrderId: deliveryPartners.currentOrderId,
      locationUpdatedAt: deliveryPartners.locationUpdatedAt,
    })
    .from(deliveryPartners)
    .orderBy(desc(deliveryPartners.locationUpdatedAt));

  res.json({
    success: true,
    riders: miArr(rows),
  });
};

router.get("/live-location", authenticate, A, getLiveLocationsHandler);
router.get("/live-locations", authenticate, A, getLiveLocationsHandler);

// GET /api/admin/riders — list all riders (includes isAvailable, currentLat, currentLon, currentOrderId)
router.get("/", authenticate, A, async (_req: AuthRequest, res: Response): Promise<void> => {
  const rows = await db
    .select()
    .from(deliveryPartners)
    .orderBy(desc(deliveryPartners.createdAt));

  res.json({
    success: true,
    riders: miArr(rows),
  });
});

export default router;
