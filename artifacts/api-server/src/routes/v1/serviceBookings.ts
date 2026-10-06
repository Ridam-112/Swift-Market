import { Router, type Response } from "express";
import { db, serviceBookings, users, shops } from "@workspace/db";
import { eq, ne, desc, and, or, sql, ilike } from "drizzle-orm";
import { authenticate, optionalAuth, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { mi, miArr } from "../../utils/mapId.js";
import { createNotificationLimited } from "../../utils/notification.js";
import { logger } from "../../lib/logger.js";

const router = Router();
const A = requireRole("admin", "super_admin", "city_manager");

// ── Ensure table exists on primary DB (Self-healing migration) ────────────────
let tableInitialized = false;
async function ensureTableExists() {
  if (tableInitialized) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS service_bookings (
        id text PRIMARY KEY,
        booking_number text NOT NULL UNIQUE,
        shop_id text,
        shop_name text NOT NULL DEFAULT 'Upahar Electronics Lab',
        customer_id text NOT NULL,
        customer_name text NOT NULL DEFAULT '',
        customer_phone text NOT NULL DEFAULT '',
        service_type text NOT NULL,
        service_category_title text NOT NULL DEFAULT 'Electronics Repair',
        appliance_brand_model text DEFAULT '',
        problem_description text NOT NULL DEFAULT '',
        preferred_date text NOT NULL,
        preferred_time_slot text NOT NULL DEFAULT 'afternoon',
        service_address text NOT NULL DEFAULT '',
        landmark text DEFAULT '',
        pincode text DEFAULT '733101',
        status text NOT NULL DEFAULT 'requested',
        visiting_fee double precision DEFAULT 0,
        parts_cost double precision DEFAULT 0,
        service_charge double precision DEFAULT 0,
        total_amount double precision DEFAULT 0,
        is_paid boolean DEFAULT false,
        payment_method text DEFAULT 'cash_on_service',
        quote_notes text,
        quoted_at timestamp,
        technician_name text,
        technician_phone text,
        assigned_at timestamp,
        admin_notes text,
        cancel_reason text,
        completed_at timestamp,
        idempotency_key text,
        created_at timestamp NOT NULL DEFAULT NOW(),
        updated_at timestamp NOT NULL DEFAULT NOW()
      );
      ALTER TABLE service_bookings ADD COLUMN IF NOT EXISTS idempotency_key text;
      CREATE INDEX IF NOT EXISTS service_bookings_cust_idx ON service_bookings(customer_id);
      CREATE INDEX IF NOT EXISTS service_bookings_stat_idx ON service_bookings(status);
      CREATE INDEX IF NOT EXISTS service_bookings_bnum_idx ON service_bookings(booking_number);
      CREATE UNIQUE INDEX IF NOT EXISTS service_bookings_idempotency_idx ON service_bookings(idempotency_key);
    `);
    tableInitialized = true;
  } catch (err: any) {
    logger.warn({ err: err?.message || err }, "ServiceBookings ensureTableExists warning");
  }
}

// ── 1. Catalog & Service Config ───────────────────────────────────────────────
// GET /api/services/catalog
router.get("/catalog", async (_req, res: Response): Promise<void> => {
  await ensureTableExists();
  res.json({
    success: true,
    provider: {
      name: "Upahar Electronics Lab",
      slug: "uphar-electronics-lab",
      city: "Balurghat",
      verified: true,
      description: "Official Electronics Repair & Maintenance Partner for SwiftMart Balurghat.",
    },
    services: [
      {
        id: "tv_repair",
        title: "LED / Smart TV Repair",
        subtitle: "Display, backlight, sound, power and motherboard repair",
        icon: "Tv",
        badge: "Most Booked",
        popular: true,
        presets: [
          "No Display / Black Screen",
          "Sound OK but No Picture",
          "Lines or Flickering on Screen",
          "Not Turning On / Dead Power Supply",
          "WiFi / Smart Apps / HDMI Port Issue",
        ],
        brandsCovered: "Samsung, LG, Sony, Mi, OnePlus, Realme, TCL, Vu, Panasonic, Videocon, etc.",
      },
      {
        id: "home_theatre",
        title: "Home Theatre & Audio System",
        subtitle: "5.1/7.1 speaker systems, amplifiers, soundbars & Bluetooth boards",
        icon: "Speaker",
        popular: true,
        presets: [
          "No Sound / Dead Audio Output",
          "Distortion / Buzzing Noise in Bass",
          "Bluetooth / AUX / Optical Port Not Connecting",
          "Subwoofer Speaker Cone Repair",
          "Channel Balance & Amplifier Board Fault",
        ],
        brandsCovered: "Sony, JBL, Bose, Philips, Zebronics, F&D, Intex, Custom Hi-Fi setups",
      },
      {
        id: "ac_service",
        title: "AC Servicing & Gas Refill",
        subtitle: "Split & Window AC cooling faults, deep jet cleaning, leak fixing",
        icon: "Snowflake",
        badge: "Expert Service",
        presets: [
          "Not Cooling / Warm Air Blowing",
          "Indoor Unit Water Leakage / Dripping",
          "Gas Pressure Low / Refrigerant Top-up",
          "Loud Noise or Vibration from Outdoor Unit",
          "Deep Foam / Jet Pressure Wash Servicing",
        ],
        brandsCovered: "Daikin, Voltas, LG, Hitachi, Carrier, Blue Star, Lloyd, Panasonic",
      },
      {
        id: "fridge_repair",
        title: "Refrigerator / Fridge Repair",
        subtitle: "Single, double door, side-by-side & inverter refrigerator repair",
        icon: "Refrigerator",
        presets: [
          "Freezer Working but Lower Fridge Warm",
          "Compressor Not Starting / Clicking Noise",
          "Continuous Frost Buildup / Defrost Timer Fault",
          "Water Pooling Under Crisper Box",
          "Gas Leakage & Cooling Coil Replacement",
        ],
        brandsCovered: "Whirlpool, LG, Samsung, Godrej, Haier, Bosch, Kelvinator",
      },
      {
        id: "fan_appliances",
        title: "Fans & Home Electricals",
        subtitle: "Ceiling fans, stand fans, mixer grinders, geysers, induction heaters",
        icon: "Fan",
        presets: [
          "Ceiling Fan Rotating Very Slow",
          "Bearing Jammed / Squeaking Noise",
          "Motor Copper Coil Rewinding",
          "Mixer Grinder Coupler / Motor Carbon Issue",
          "Induction Cooktop E0/E1 Error Code",
        ],
        brandsCovered: "Havells, Orient, Crompton, Usha, Bajaj, Philips, Prestige",
      },
      {
        id: "other",
        title: "Washing Machine / Microwave / Custom",
        subtitle: "Semi & fully automatic washing machines, microwave ovens, electronics",
        icon: "Wrench",
        presets: [
          "Microwave Running but Not Heating",
          "Washing Machine Not Spinning / Draining",
          "PCB Board Short-Circuit Repair",
          "General Electronic Equipment Diagnostics",
        ],
        brandsCovered: "All brands and custom electronic appliances",
      },
    ],
    timeSlots: [
      { id: "morning", label: "Morning (10:00 AM – 01:00 PM)" },
      { id: "afternoon", label: "Afternoon (01:00 PM – 05:00 PM)" },
      { id: "evening", label: "Evening (05:00 PM – 08:00 PM)" },
    ],
    policy: {
      inspectionNote: "A certified technician from Upahar Electronics Lab will visit your location to inspect the appliance.",
      pricingNote: "Diagnosis report, spare parts cost, and complete repair bill will be updated online after inspection for your review and approval.",
    },
  });
});

// ── 2. Customer: Book a Service ───────────────────────────────────────────────
// POST /api/services/book
router.post("/book", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureTableExists();
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Please log in to book a service." });
      return;
    }

    const {
      serviceType,
      serviceCategoryTitle,
      applianceBrandModel,
      problemDescription,
      preferredDate,
      preferredTimeSlot = "afternoon",
      serviceAddress,
      landmark,
      pincode = "733101",
      customerName,
      customerPhone,
    } = req.body;

    if (!serviceType || !problemDescription?.trim() || !preferredDate || !serviceAddress?.trim()) {
      res.status(400).json({
        success: false,
        message: "Please fill in all required fields (Service Type, Problem Description, Date, and Address).",
      });
      return;
    }

    // Lookup user info if not provided in body
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const resolvedName = customerName?.trim() || user?.name || "Customer";
    const resolvedPhone = customerPhone?.trim() || user?.phone || "";

    if (!resolvedPhone) {
      res.status(400).json({ success: false, message: "Valid contact phone number is required." });
      return;
    }

    const clientKey = typeof req.body.idempotencyKey === "string" && req.body.idempotencyKey.trim()
      ? req.body.idempotencyKey.trim()
      : (typeof req.headers["x-idempotency-key"] === "string" ? req.headers["x-idempotency-key"].trim() : null);

    // Derive deterministic key: customer + serviceType + preferredDate + preferredTimeSlot
    const safeKey = `${userId}_${String(serviceType).trim()}_${String(preferredDate).trim()}_${String(preferredTimeSlot).trim()}`.toLowerCase().replace(/\s+/g, "_");
    const idempotencyKey = clientKey || safeKey;

    // Check if an existing active booking already exists for this slot
    const [existingBooking] = await db.select().from(serviceBookings)
      .where(and(
        eq(serviceBookings.idempotencyKey, idempotencyKey),
        ne(serviceBookings.status, "cancelled")
      ))
      .limit(1);

    if (existingBooking) {
      res.json({
        success: true,
        message: "Service already booked for this time slot! Our technician will reach out to you.",
        booking: mi(existingBooking),
      });
      return;
    }

    // Lookup Upahar Electronics Lab shop ID
    let shopId: string | null = null;
    try {
      const [upharShop] = await db.select({ id: shops.id })
        .from(shops)
        .where(or(
          ilike(shops.shopName, "%uphar%"),
          ilike(shops.shopName, "%upahar%")
        ))
        .limit(1);
      if (upharShop) shopId = upharShop.id;
    } catch (_) {}

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const datePrefix = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const bookingNumber = `SRV-${datePrefix}-${randomSuffix}`;

    const [newBooking] = await db.insert(serviceBookings).values({
      bookingNumber,
      idempotencyKey,
      shopId,
      shopName: "Upahar Electronics Lab",
      customerId: userId,
      customerName: resolvedName,
      customerPhone: resolvedPhone,
      serviceType: String(serviceType).trim(),
      serviceCategoryTitle: String(serviceCategoryTitle || "Electronics Repair").trim(),
      applianceBrandModel: String(applianceBrandModel || "").trim(),
      problemDescription: String(problemDescription).trim(),
      preferredDate: String(preferredDate).trim(),
      preferredTimeSlot: String(preferredTimeSlot).trim(),
      serviceAddress: String(serviceAddress).trim(),
      landmark: String(landmark || "").trim(),
      pincode: String(pincode || "733101").trim(),
      status: "requested",
      visitingFee: 0,
      partsCost: 0,
      serviceCharge: 0,
      totalAmount: 0,
      isPaid: false,
      paymentMethod: "cash_on_service",
    }).returning();

    // Send in-app notification to customer
    void createNotificationLimited(userId, {
      type: "system",
      title: "Service Booking Received! 🛠️",
      message: `Your service request #${bookingNumber} for ${serviceCategoryTitle || "Electronics Repair"} has been received. Upahar Electronics Lab will contact you soon.`,
      data: { url: "/service-corner" },
    });

    res.json({
      success: true,
      message: "Service booked successfully! Our technician team will reach out to you.",
      booking: mi(newBooking),
    });
  } catch (err: any) {
    if (
      err?.code === "23505" ||
      err?.cause?.code === "23505" ||
      String(err?.message || "").includes("service_bookings_idempotency_idx") ||
      String(err?.detail || "").includes("idempotency_key")
    ) {
      logger.info("Concurrent duplicate service booking caught by unique index. Returning existing booking.");
      try {
        const clientKey = typeof req.body.idempotencyKey === "string" && req.body.idempotencyKey.trim()
          ? req.body.idempotencyKey.trim()
          : (typeof req.headers["x-idempotency-key"] === "string" ? req.headers["x-idempotency-key"].trim() : null);
        const safeKey = `${req.user?.userId}_${String(req.body.serviceType).trim()}_${String(req.body.preferredDate).trim()}_${String(req.body.preferredTimeSlot).trim()}`.toLowerCase().replace(/\s+/g, "_");
        const idempotencyKey = clientKey || safeKey;

        const [existingBooking] = await db.select().from(serviceBookings)
          .where(eq(serviceBookings.idempotencyKey, idempotencyKey))
          .limit(1);

        if (existingBooking) {
          res.json({
            success: true,
            message: "Service already booked for this time slot! Our technician will reach out to you.",
            booking: mi(existingBooking),
          });
          return;
        }
      } catch (_) {}
    }
    logger.error({ err: err?.message || err }, "POST /api/services/book failed");
    res.status(500).json({ success: false, message: "Failed to book service. Please try again." });
  }
});

// ── 3. Customer: View My Bookings ─────────────────────────────────────────────
// GET /api/services/my-bookings
router.get("/my-bookings", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureTableExists();
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const rows = await db.select()
      .from(serviceBookings)
      .where(eq(serviceBookings.customerId, userId))
      .orderBy(desc(serviceBookings.createdAt));

    res.json({ success: true, bookings: miArr(rows) });
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "GET /api/services/my-bookings failed");
    res.status(500).json({ success: false, message: "Failed to load bookings." });
  }
});

// ── 4. Customer: Cancel Booking ───────────────────────────────────────────────
// PATCH /api/services/:id/cancel
router.patch("/:id/cancel", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureTableExists();
    const userId = req.user?.userId;
    const id = String(req.params["id"] || "");
    const { reason = "Cancelled by user" } = req.body;

    const [booking] = await db.select().from(serviceBookings).where(eq(serviceBookings.id, id)).limit(1);
    if (!booking) {
      res.status(404).json({ success: false, message: "Booking not found" });
      return;
    }

    if (booking.customerId !== userId && req.user?.role !== "admin" && req.user?.role !== "super_admin") {
      res.status(403).json({ success: false, message: "Not permitted to cancel this booking" });
      return;
    }

    if (booking.status === "completed") {
      res.status(400).json({ success: false, message: "Cannot cancel a completed service." });
      return;
    }

    const [updated] = await db.update(serviceBookings)
      .set({
        status: "cancelled",
        cancelReason: String(reason).trim(),
        updatedAt: new Date(),
      })
      .where(eq(serviceBookings.id, id))
      .returning();

    res.json({ success: true, message: "Booking cancelled successfully", booking: mi(updated) });
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "PATCH /api/services/:id/cancel failed");
    res.status(500).json({ success: false, message: "Failed to cancel booking." });
  }
});

// ── 5. Admin: List All Service Bookings ────────────────────────────────────────
// GET /api/services/admin/bookings
router.get("/admin/bookings", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureTableExists();
    const { status, search, serviceType, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pg = Math.max(1, parseInt(page) || 1);
    const lm = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const offset = (pg - 1) * lm;

    const conditions = [];

    if (status && status !== "all") {
      conditions.push(eq(serviceBookings.status, status));
    }
    if (serviceType && serviceType !== "all") {
      conditions.push(eq(serviceBookings.serviceType, serviceType));
    }
    if (search?.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(serviceBookings.bookingNumber, q),
          ilike(serviceBookings.customerName, q),
          ilike(serviceBookings.customerPhone, q),
          ilike(serviceBookings.serviceAddress, q),
          ilike(serviceBookings.applianceBrandModel, q)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [countRow]] = await Promise.all([
      db.select()
        .from(serviceBookings)
        .where(whereClause)
        .orderBy(desc(serviceBookings.createdAt))
        .limit(lm)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` })
        .from(serviceBookings)
        .where(whereClause),
    ]);

    const total = Number(countRow?.count ?? 0);

    // Compute status counts for Admin badges
    const statusCounts = await db.select({
      status: serviceBookings.status,
      count: sql<number>`count(*)`,
    }).from(serviceBookings).groupBy(serviceBookings.status);

    const counts: Record<string, number> = {
      all: total,
      requested: 0,
      inspection_scheduled: 0,
      quote_provided: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const r of statusCounts) {
      if (r.status in counts) counts[r.status] = Number(r.count);
    }

    res.json({
      success: true,
      bookings: miArr(rows),
      total,
      page: pg,
      totalPages: Math.ceil(total / lm),
      statusCounts: counts,
    });
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "GET /api/services/admin/bookings failed");
    res.status(500).json({ success: false, message: "Failed to load admin service bookings." });
  }
});

// ── 6. Admin: Update Booking, Set Quote/Price & Assign Technician ─────────────
// PATCH /api/services/admin/bookings/:id
router.patch("/admin/bookings/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureTableExists();
    const id = String(req.params["id"] || "");
    const body = req.body as Record<string, any>;

    const [existing] = await db.select().from(serviceBookings).where(eq(serviceBookings.id, id)).limit(1);
    if (!existing) {
      res.status(404).json({ success: false, message: "Service booking not found" });
      return;
    }

    const updates: Partial<typeof serviceBookings.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (body.status !== undefined) updates.status = body.status;
    if (body.technicianName !== undefined) updates.technicianName = body.technicianName?.trim();
    if (body.technicianPhone !== undefined) updates.technicianPhone = body.technicianPhone?.trim();
    if (body.technicianName && !existing.technicianName) updates.assignedAt = new Date();

    // Price updates — visitingFee, partsCost, serviceCharge, totalAmount
    let hasPriceUpdate = false;
    if (body.visitingFee !== undefined) {
      updates.visitingFee = Number(body.visitingFee) || 0;
      hasPriceUpdate = true;
    }
    if (body.partsCost !== undefined) {
      updates.partsCost = Number(body.partsCost) || 0;
      hasPriceUpdate = true;
    }
    if (body.serviceCharge !== undefined) {
      updates.serviceCharge = Number(body.serviceCharge) || 0;
      hasPriceUpdate = true;
    }
    if (body.totalAmount !== undefined) {
      updates.totalAmount = Number(body.totalAmount) || 0;
      hasPriceUpdate = true;
    } else if (hasPriceUpdate) {
      // Auto-compute totalAmount if individual fields changed
      const vf = (updates.visitingFee !== undefined ? updates.visitingFee : existing.visitingFee) ?? 0;
      const pc = (updates.partsCost !== undefined ? updates.partsCost : existing.partsCost) ?? 0;
      const sc = (updates.serviceCharge !== undefined ? updates.serviceCharge : existing.serviceCharge) ?? 0;
      updates.totalAmount = vf + pc + sc;
    }

    if (body.isPaid !== undefined) updates.isPaid = Boolean(body.isPaid);
    if (body.paymentMethod !== undefined) updates.paymentMethod = body.paymentMethod;
    if (body.quoteNotes !== undefined) {
      updates.quoteNotes = body.quoteNotes?.trim();
      hasPriceUpdate = true;
    }
    if (hasPriceUpdate && !existing.quotedAt) {
      updates.quotedAt = new Date();
      // If status is still "requested" or "inspection_scheduled", move it to "quote_provided"
      if (!body.status && (existing.status === "requested" || existing.status === "inspection_scheduled")) {
        updates.status = "quote_provided";
      }
    }

    if (body.adminNotes !== undefined) updates.adminNotes = body.adminNotes?.trim();
    if (body.cancelReason !== undefined) updates.cancelReason = body.cancelReason?.trim();
    if (body.status === "completed" && !existing.completedAt) {
      updates.completedAt = new Date();
    }

    const [updated] = await db.update(serviceBookings)
      .set(updates)
      .where(eq(serviceBookings.id, id))
      .returning();

    // Send push / in-app notification to customer if status or quote changed
    if (body.status && body.status !== existing.status) {
      let statusMsg = "";
      if (body.status === "inspection_scheduled") {
        statusMsg = `Inspection scheduled for your booking #${existing.bookingNumber}. Technician will contact you.`;
      } else if (body.status === "quote_provided") {
        statusMsg = `Price quote of ₹${updated.totalAmount} has been generated for booking #${existing.bookingNumber}. Please review online.`;
      } else if (body.status === "in_progress") {
        statusMsg = `Repair work is now in progress for your appliance (#${existing.bookingNumber}).`;
      } else if (body.status === "completed") {
        statusMsg = `Service successfully completed for booking #${existing.bookingNumber}. Thank you for choosing Upahar Electronics Lab & SwiftMart!`;
      } else if (body.status === "cancelled") {
        statusMsg = `Service booking #${existing.bookingNumber} has been cancelled.`;
      }

      if (statusMsg) {
        void createNotificationLimited(existing.customerId, {
          type: "system",
          title: `Service Update: #${existing.bookingNumber}`,
          message: statusMsg,
          data: { url: "/service-corner" },
        });
      }
    } else if (hasPriceUpdate && updated.totalAmount && updated.totalAmount !== existing.totalAmount) {
      void createNotificationLimited(existing.customerId, {
        type: "system",
        title: `Price Quote Updated: #${existing.bookingNumber}`,
        message: `Total estimated bill of ₹${updated.totalAmount} has been updated for your service.`,
        data: { url: "/service-corner" },
      });
    }

    res.json({
      success: true,
      message: "Booking updated successfully",
      booking: mi(updated),
    });
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "PATCH /api/services/admin/bookings/:id failed");
    res.status(500).json({ success: false, message: "Failed to update booking." });
  }
});

// ── 7. Admin: Delete Booking ──────────────────────────────────────────────────
// DELETE /api/services/admin/bookings/:id
router.delete("/admin/bookings/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureTableExists();
    const id = String(req.params["id"] || "");
    await db.delete(serviceBookings).where(eq(serviceBookings.id, id));
    res.json({ success: true, message: "Booking deleted successfully" });
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "DELETE /api/services/admin/bookings/:id failed");
    res.status(500).json({ success: false, message: "Failed to delete booking." });
  }
});

export default router;
