import { Router, type Response } from "express";
import { db, admins, users, shops, orders, deliveryPartners, payouts, cities, managerCities, managerActivityLogs } from "@workspace/db";
import { eq, and, inArray, count, sum, gte, desc } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { mi, miArr } from "../../utils/mapId.js";

const router = Router();
const SA = requireRole("super_admin");
const A = requireRole("admin", "super_admin");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/admin/stats
router.get("/stats", authenticate, A, async (_req, res: Response): Promise<void> => {
  const [
    [{ totalUsers }],
    [{ totalShops }],
    [{ pendingShops }],
    [{ totalOrders }],
    [{ pendingOrders }],
    [{ activeDelivery }],
    [{ pendingPayouts }],
    revenueResult,
  ] = await Promise.all([
    db.select({ totalUsers: count() }).from(users).where(eq(users.role, "customer")),
    db.select({ totalShops: count() }).from(shops).where(eq(shops.status, "approved")),
    db.select({ pendingShops: count() }).from(shops).where(eq(shops.status, "pending")),
    db.select({ totalOrders: count() }).from(orders).where(eq(orders.status, "delivered")),
    // Active statuses in the real order lifecycle (placed → confirmed → packed → out_for_delivery → delivered)
    db.select({ pendingOrders: count() }).from(orders).where(inArray(orders.status, ["placed", "confirmed", "packed", "out_for_delivery"])),
    db.select({ activeDelivery: count() }).from(deliveryPartners).where(and(eq(deliveryPartners.status, "active"), eq(deliveryPartners.isAvailable, true))),
    db.select({ pendingPayouts: count() }).from(payouts).where(eq(payouts.status, "pending")),
    db.select({ totalRevenue: sum(orders.netAmount), totalCommission: sum(orders.commissionAmount) }).from(orders).where(eq(orders.status, "delivered")),
  ]);

  res.json({
    success: true,
    stats: {
      totalUsers: Number(totalUsers),
      totalShops: Number(totalShops),
      pendingShops: Number(pendingShops),
      totalOrders: Number(totalOrders),
      pendingOrders: Number(pendingOrders),
      activeDelivery: Number(activeDelivery),
      pendingPayouts: Number(pendingPayouts),
      totalRevenue: Number(revenueResult[0]?.totalRevenue ?? 0),
      totalCommission: Number(revenueResult[0]?.totalCommission ?? 0),
    },
  });
});

// GET /api/admin/user-signups
router.get("/user-signups", authenticate, A, async (_req, res: Response): Promise<void> => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const result = await db.select({ createdAt: users.createdAt }).from(users)
    .where(and(eq(users.role, "customer"), gte(users.createdAt, sixMonthsAgo)));
  const dates = result.map((u) => u.createdAt.toISOString());
  res.json({ success: true, dates });
});

// GET /api/admin/admins
router.get("/admins", authenticate, SA, async (_req, res: Response): Promise<void> => {
  const result = await db.select({
    id: admins.id, phone: admins.phone, name: admins.name, role: admins.role,
    status: admins.status, addedBy: admins.addedBy, createdAt: admins.createdAt, updatedAt: admins.updatedAt,
  }).from(admins).orderBy(admins.createdAt);
  res.json({ success: true, admins: miArr(result) });
});

// POST /api/admin/admins
router.post("/admins", authenticate, SA, async (req: AuthRequest, res: Response): Promise<void> => {
  const { phone, name, role = "admin" } = req.body as { phone: string; name: string; role?: "admin" | "super_admin" };
  if (!phone || !name) { res.status(400).json({ success: false, message: "Phone and name required" }); return; }
  const [existing] = await db.select().from(admins).where(eq(admins.phone, phone)).limit(1);
  if (existing) { res.status(409).json({ success: false, message: "Admin with this phone already exists" }); return; }
  const [admin] = await db.insert(admins).values({ phone, name, role, status: "active", addedBy: req.user!.userId }).returning();
  await db.update(users).set({ role }).where(eq(users.phone, phone));
  res.status(201).json({ success: true, admin: mi(admin) });
});

// PATCH /api/admin/admins/:id
router.patch("/admins/:id", authenticate, SA, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!UUID_RE.test(req.params["id"] as string)) {
    res.status(400).json({ success: false, message: "Invalid admin ID" });
    return;
  }
  const { role, status } = req.body as { role?: "admin" | "super_admin"; status?: "active" | "suspended" };
  const update: Record<string, unknown> = {};
  if (role) update.role = role;
  if (status) update.status = status;
  const [admin] = await db.update(admins).set(update).where(eq(admins.id, req.params["id"] as string)).returning();
  if (!admin) { res.status(404).json({ success: false, message: "Admin not found" }); return; }
  res.json({ success: true, admin: mi(admin) });
});

// DELETE /api/admin/admins/:id
router.delete("/admins/:id", authenticate, SA, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!UUID_RE.test(req.params["id"] as string)) {
    res.status(400).json({ success: false, message: "Invalid admin ID" });
    return;
  }
  await db.delete(admins).where(eq(admins.id, req.params["id"] as string));
  res.json({ success: true, message: "Admin removed" });
});

// ─── City Management ──────────────────────────────────────────────────────────

// GET /api/admin/cities — list all cities
router.get("/cities", authenticate, A, async (_req, res: Response): Promise<void> => {
  try {
    const list = await db.select().from(cities).orderBy(cities.name);
    res.json({ success: true, cities: list });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/cities — add a new city
router.post("/cities", authenticate, SA, async (req: AuthRequest, res: Response): Promise<void> => {
  const { id, name } = req.body as { id: string; name: string };
  if (!id || !name) {
    res.status(400).json({ success: false, message: "ID (slug) and Name are required" });
    return;
  }
  try {
    const [newCity] = await db.insert(cities).values({
      id: id.toLowerCase().trim(),
      name: name.trim(),
      isActive: true
    }).returning();
    res.status(201).json({ success: true, city: newCity });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/cities/:id — toggle active status of a city
router.put("/cities/:id", authenticate, SA, async (req: AuthRequest, res: Response): Promise<void> => {
  const { isActive } = req.body as { isActive: boolean };
  try {
    const [updated] = await db.update(cities)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(cities.id, req.params["id"] as string))
      .returning();
    if (!updated) {
      res.status(404).json({ success: false, message: "City not found" });
      return;
    }
    res.json({ success: true, city: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/cities/:id — delete a city
router.delete("/cities/:id", authenticate, SA, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await db.delete(cities).where(eq(cities.id, req.params["id"] as string));
    res.json({ success: true, message: "City deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Manager Management ───────────────────────────────────────────────────────

// GET /api/admin/managers — list all city managers
router.get("/managers", authenticate, SA, async (_req, res: Response): Promise<void> => {
  try {
    // Select all users with role 'city_manager'
    const list = await db.select().from(users).where(eq(users.role, "city_manager")).orderBy(users.name);
    
    // For each manager, fetch assigned cities
    const enriched = await Promise.all(list.map(async (m) => {
      const assigned = await db.select({
        cityId: managerCities.cityId,
        cityName: cities.name
      })
      .from(managerCities)
      .leftJoin(cities, eq(managerCities.cityId, cities.id))
      .where(eq(managerCities.managerId, m.id));
      
      return {
        ...m,
        assignedCities: assigned
      };
    }));
    
    res.json({ success: true, managers: miArr(enriched) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/managers — create a new city manager
router.post("/managers", authenticate, SA, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, phone, email, cityIds } = req.body as { name: string; phone: string; email?: string; cityIds: string[] };
  if (!name || !phone) {
    res.status(400).json({ success: false, message: "Name and Phone are required" });
    return;
  }
  
  try {
    // Check if user already exists
    const [existing] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    
    let managerId: string;
    if (existing) {
      // Elevate existing user to city_manager
      await db.update(users).set({ role: "city_manager", updatedAt: new Date() }).where(eq(users.id, existing.id));
      managerId = existing.id;
    } else {
      // Create new user with city_manager role
      const [newUser] = await db.insert(users).values({
        name,
        phone,
        email: email || undefined,
        role: "city_manager",
        status: "active",
      }).returning();
      managerId = newUser!.id;
    }
    
    // Assign cities
    if (cityIds && cityIds.length > 0) {
      await db.insert(managerCities).values(
        cityIds.map(cityId => ({ managerId, cityId }))
      );
    }
    
    res.status(201).json({ success: true, managerId });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/admin/managers/:id — update manager details / status / assignments
router.patch("/managers/:id", authenticate, SA, async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, cityIds } = req.body as { status?: "active" | "suspended"; cityIds?: string[] };
  const managerId = req.params["id"] as string;
  
  try {
    if (status) {
      await db.update(users).set({ status, updatedAt: new Date() }).where(eq(users.id, managerId));
    }
    
    if (cityIds !== undefined) {
      // Remove old assignments and insert new ones
      await db.delete(managerCities).where(eq(managerCities.managerId, managerId));
      if (cityIds.length > 0) {
        await db.insert(managerCities).values(
          cityIds.map(cityId => ({ managerId, cityId }))
        );
      }
    }
    
    res.json({ success: true, message: "Manager updated successfully" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/managers/:id — delete/remove manager (resets role to customer)
router.delete("/managers/:id", authenticate, SA, async (req: AuthRequest, res: Response): Promise<void> => {
  const managerId = req.params["id"] as string;
  try {
    // Reset role to customer and remove city assignments
    await db.update(users).set({ role: "customer", updatedAt: new Date() }).where(eq(users.id, managerId));
    await db.delete(managerCities).where(eq(managerCities.managerId, managerId));
    res.json({ success: true, message: "Manager removed successfully" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/manager-logs — view managers' activity logs
router.get("/manager-logs", authenticate, SA, async (_req, res: Response): Promise<void> => {
  try {
    const logs = await db.select().from(managerActivityLogs).orderBy(desc(managerActivityLogs.createdAt)).limit(1000);
    res.json({ success: true, logs: miArr(logs) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
