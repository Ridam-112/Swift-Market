import { Router, type Response } from "express";
import { db, deliveryPartners, users } from "@workspace/db";
import { eq, desc, and, or, ilike, sql } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { validateUuidParams } from "../../middlewares/validateUuid.js";
import { mi, miArr } from "../../utils/mapId.js";
import { logger } from "../../lib/logger.js";

const router = Router();
const A = requireRole("admin", "super_admin");

/**
 * Auto-repairs missing columns in delivery_partners table if any schema drift occurs.
 */
async function autoRepairRiderTable(): Promise<void> {
  await db.execute(sql`
    ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS heading double precision;
    ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS speed double precision;
    ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS accuracy double precision;
    ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS tracking_status text DEFAULT 'LIVE';
    ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS application_status text DEFAULT 'approved';
    ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS pan_number text;
    ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS dl_number text;
    ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS rc_number text;
    ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '{}'::jsonb;
    ALTER TABLE delivery_partners ADD COLUMN IF NOT EXISTS rejection_reason text;
  `);
}

/**
 * ─── ADMIN RIDER MANAGEMENT ROUTES ───────────────────────────────────────────
 * Mounted at: /api/admin/riders
 */

// GET /api/admin/riders/applications — list rider applications (pending by default)
router.get("/applications", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const statusParam = (req.query["status"] as string | undefined) ?? "pending";
  try {
    const where = statusParam === "all" ? undefined : eq(deliveryPartners.applicationStatus, statusParam);
    const rows = await db
      .select()
      .from(deliveryPartners)
      .where(where)
      .orderBy(desc(deliveryPartners.createdAt));

    res.json({ success: true, applications: miArr(rows) });
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "GET /api/admin/riders/applications failed — attempting table auto-repair");
    try {
      await autoRepairRiderTable();
      const where = statusParam === "all" ? undefined : eq(deliveryPartners.applicationStatus, statusParam);
      const rows = await db
        .select()
        .from(deliveryPartners)
        .where(where)
        .orderBy(desc(deliveryPartners.createdAt));
      res.json({ success: true, applications: miArr(rows) });
    } catch (retryErr: any) {
      logger.error({ retryErr: retryErr?.message || retryErr }, "GET /api/admin/riders/applications retry failed");
      res.status(500).json({ success: false, message: "Failed to load rider applications", error: retryErr?.message });
    }
  }
});

// POST /api/admin/riders/:id/approve — approve rider application
router.post("/:id/approve", authenticate, A, validateUuidParams("id"), async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params["id"] as string;
  try {
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
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "POST /api/admin/riders/:id/approve failed");
    res.status(500).json({ success: false, message: "Failed to approve rider", error: err?.message });
  }
});

// POST /api/admin/riders/:id/reject — reject rider application
router.post("/:id/reject", authenticate, A, validateUuidParams("id"), async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params["id"] as string;
  const { reason } = req.body as { reason?: string };

  try {
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
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "POST /api/admin/riders/:id/reject failed");
    res.status(500).json({ success: false, message: "Failed to reject rider", error: err?.message });
  }
});

// PATCH /api/admin/riders/:id/status — toggle active/inactive or availability
router.patch("/:id/status", authenticate, A, validateUuidParams("id"), async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params["id"] as string;
  const { status, isAvailable } = req.body as { status?: string; isAvailable?: boolean };

  try {
    const patchData: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof status === "string") patchData["status"] = status;
    if (typeof isAvailable === "boolean") patchData["isAvailable"] = isAvailable;

    const [updated] = await db
      .update(deliveryPartners)
      .set(patchData)
      .where(eq(deliveryPartners.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ success: false, message: "Rider not found" });
      return;
    }

    res.json({
      success: true,
      message: `Rider '${updated.name}' status updated`,
      rider: mi(updated),
    });
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "PATCH /api/admin/riders/:id/status failed");
    res.status(500).json({ success: false, message: "Failed to update rider status", error: err?.message });
  }
});

// GET /api/admin/riders/live-location (and live-locations) — returns rider table's live location info
const getLiveLocationsHandler = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
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
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "GET /api/admin/riders/live-location failed");
    res.status(500).json({ success: false, message: "Failed to get live locations", error: err?.message });
  }
};

router.get("/live-location", authenticate, A, getLiveLocationsHandler);
router.get("/live-locations", authenticate, A, getLiveLocationsHandler);

// GET /api/admin/riders — list all riders (includes isAvailable, currentLat, currentLon, currentOrderId)
router.get("/", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { city, status, applicationStatus } = req.query as Record<string, string | undefined>;
    const conditions = [];

    if (applicationStatus && applicationStatus !== "all") {
      conditions.push(eq(deliveryPartners.applicationStatus, applicationStatus));
    }

    if (status && status !== "all") {
      conditions.push(eq(deliveryPartners.status, status));
    }

    if (city && city !== "all") {
      conditions.push(or(
        ilike(deliveryPartners.cityId, `%${city}%`),
        sql`${deliveryPartners.cityId} IS NULL`,
        sql`${deliveryPartners.cityId} = ''`
      )!);
    }

    const where = conditions.length ? and(...conditions) : undefined;
    const rows = await db
      .select()
      .from(deliveryPartners)
      .where(where)
      .orderBy(desc(deliveryPartners.createdAt));

    res.json({
      success: true,
      riders: miArr(rows),
    });
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "GET /api/admin/riders failed — attempting table auto-repair");
    try {
      await autoRepairRiderTable();
      const rows = await db
        .select()
        .from(deliveryPartners)
        .orderBy(desc(deliveryPartners.createdAt));
      res.json({
        success: true,
        riders: miArr(rows),
      });
    } catch (retryErr: any) {
      logger.error({ retryErr: retryErr?.message || retryErr }, "GET /api/admin/riders retry failed");
      res.status(500).json({ success: false, message: "Failed to load riders", error: retryErr?.message });
    }
  }
});

export default router;
