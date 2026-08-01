import { Router, type Response, type NextFunction } from "express";
import { db, users, shops, orders, deliveryPartners, payouts, coupons, supportTickets, cities, managerCities, managerActivityLogs } from "@workspace/db";
import { eq, and, inArray, count, sum, gte, desc, sql } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../../middlewares/auth.js";
import { mi, miArr } from "../../utils/mapId.js";
import { logger } from "../../lib/logger.js";
import { createNotificationLimited, sendPushToUsers } from "../../utils/notification.js";

const router = Router();

// Middleware to verify manager role or super admin role
const requireManager = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }
  if (req.user.role !== "city_manager" && req.user.role !== "super_admin") {
    res.status(403).json({ success: false, message: "Forbidden: insufficient role" });
    return;
  }
  next();
};

// Middleware to check if the manager has access to the requested cityId
async function checkCityAccess(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }
  if (req.user.role === "super_admin") {
    next();
    return;
  }
  const managerId = req.user.userId;
  // Get cityId from request query, params, or body
  const cityId = req.query["cityId"] || req.params["cityId"] || req.body["cityId"];
  
  if (!cityId) {
    res.status(400).json({ success: false, message: "Missing cityId parameter" });
    return;
  }
  
  const [assignment] = await db.select()
    .from(managerCities)
    .where(and(eq(managerCities.managerId, managerId), eq(managerCities.cityId, String(cityId))))
    .limit(1);
    
  if (!assignment) {
    res.status(403).json({ success: false, message: "Forbidden: you do not manage this city" });
    return;
  }
  next();
}

// Log manager actions
async function logAction(managerId: string, managerName: string, cityId: string | null, action: string, details: string) {
  try {
    await db.insert(managerActivityLogs).values({
      managerId,
      managerName,
      cityId,
      action,
      details,
    });
  } catch (err) {
    logger.error({ err }, "Failed to log manager action");
  }
}

// ─── GET /api/manager/cities ──────────────────────────────────────────────────
// List all cities managed by the current manager
router.get("/cities", authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role === "super_admin") {
      const list = await db.select().from(cities).orderBy(cities.name);
      res.json({ success: true, cities: list });
      return;
    }
    
    const list = await db.select({
      id: cities.id,
      name: cities.name,
      isActive: cities.isActive
    })
    .from(managerCities)
    .innerJoin(cities, eq(managerCities.cityId, cities.id))
    .where(eq(managerCities.managerId, req.user!.userId))
    .orderBy(cities.name);
    
    res.json({ success: true, cities: list });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/manager/stats ───────────────────────────────────────────────────
// Metrics overview for the selected city
router.get("/stats", authenticate, requireManager, checkCityAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  const cityId = String(req.query["cityId"]);
  const startOfDay = new Date();
  startOfDay.setHours(0,0,0,0);
  
  try {
    const [
      [{ todayOrders }],
      [{ todayRevenue }],
      [{ monthlyRevenue }],
      [{ pendingOrders }],
      [{ completedOrders }],
      [{ cancelledOrders }],
      [{ activeShops }],
      [{ activeDelivery }],
      [{ totalCustomers }],
    ] = await Promise.all([
      db.select({ todayOrders: count() }).from(orders).where(and(eq(orders.cityId, cityId), gte(orders.createdAt, startOfDay))),
      db.select({ todayRevenue: sum(orders.netAmount) }).from(orders).where(and(eq(orders.cityId, cityId), eq(orders.status, "delivered"), gte(orders.createdAt, startOfDay))),
      db.select({ monthlyRevenue: sum(orders.netAmount) }).from(orders).where(and(eq(orders.cityId, cityId), eq(orders.status, "delivered"), gte(orders.createdAt, new Date(new Date().getFullYear(), new Date().getMonth(), 1)))),
      db.select({ pendingOrders: count() }).from(orders).where(and(eq(orders.cityId, cityId), inArray(orders.status, ["placed", "confirmed", "packed", "out_for_delivery"]))),
      db.select({ completedOrders: count() }).from(orders).where(and(eq(orders.cityId, cityId), eq(orders.status, "delivered"))),
      db.select({ cancelledOrders: count() }).from(orders).where(and(eq(orders.cityId, cityId), eq(orders.status, "cancelled"))),
      db.select({ activeShops: count() }).from(shops).where(and(eq(shops.cityId, cityId), eq(shops.status, "approved"))),
      db.select({ activeDelivery: count() }).from(deliveryPartners).where(and(eq(deliveryPartners.cityId, cityId), eq(deliveryPartners.status, "active"))),
      db.select({ totalCustomers: count() }).from(users).where(and(eq(users.cityId, cityId), eq(users.role, "customer"))),
    ]);

    res.json({
      success: true,
      stats: {
        todayOrders: Number(todayOrders),
        todayRevenue: Number(todayRevenue ?? 0),
        monthlyRevenue: Number(monthlyRevenue ?? 0),
        pendingOrders: Number(pendingOrders),
        completedOrders: Number(completedOrders),
        cancelledOrders: Number(cancelledOrders),
        activeShops: Number(activeShops),
        activeDelivery: Number(activeDelivery),
        totalCustomers: Number(totalCustomers),
        avgDeliveryTime: "24 mins",
        pendingPayout: 0,
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/manager/analytics ───────────────────────────────────────────────
// Performance analytics graphs
router.get("/analytics", authenticate, requireManager, checkCityAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  const cityId = String(req.query["cityId"]);
  try {
    const recent = await db.select().from(orders).where(and(eq(orders.cityId, cityId), eq(orders.status, "delivered"))).orderBy(desc(orders.createdAt)).limit(100);
    
    // Group orders by day
    const dayMap: Record<string, { date: string; revenue: number; orders: number }> = {};
    recent.forEach(o => {
      const dateStr = o.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!dayMap[dateStr]) dayMap[dateStr] = { date: dateStr, revenue: 0, orders: 0 };
      dayMap[dateStr].revenue += o.netAmount;
      dayMap[dateStr].orders += 1;
    });

    res.json({
      success: true,
      analytics: {
        chartData: Object.values(dayMap).reverse(),
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/manager/finances ────────────────────────────────────────────────
// Financial calculations
router.get("/finances", authenticate, requireManager, checkCityAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  const cityId = String(req.query["cityId"]);
  try {
    const [finances] = await db.select({
      totalSales: sum(orders.netAmount),
      commission: sum(orders.commissionAmount),
      deliveryCharges: sum(orders.deliveryCharge),
      vendorEarnings: sum(orders.vendorPayable),
      refundAmount: sum(orders.couponDiscount), // placeholder mapping
    })
    .from(orders)
    .where(and(eq(orders.cityId, cityId), eq(orders.status, "delivered")));

    res.json({
      success: true,
      finances: {
        totalSales: Number(finances?.totalSales ?? 0),
        platformCommission: Number(finances?.commission ?? 0),
        deliveryCharges: Number(finances?.deliveryCharges ?? 0),
        vendorEarnings: Number(finances?.vendorEarnings ?? 0),
        riderEarnings: Number(finances?.deliveryCharges ?? 0) * 0.8, // estimated
        refundAmount: Number(finances?.refundAmount ?? 0),
        netRevenue: Number(finances?.commission ?? 0) + Number(finances?.deliveryCharges ?? 0) * 0.2
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Orders Endpoints ──────────────────────────────────────────────────────────
router.get("/orders", authenticate, requireManager, checkCityAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  const cityId = String(req.query["cityId"]);
  try {
    const list = await db.select().from(orders).where(eq(orders.cityId, cityId)).orderBy(desc(orders.createdAt)).limit(200);
    res.json({ success: true, orders: miArr(list) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch("/orders/:id/status", authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, deliveryPartnerId } = req.body as { status?: string; deliveryPartnerId?: string };
  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, req.params["id"] as string)).limit(1);
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (deliveryPartnerId !== undefined) updates.deliveryPartnerId = deliveryPartnerId || null;

    const [updated] = await db.update(orders).set(updates).where(eq(orders.id, order.id)).returning();
    
    // Log manager action
    await logAction(req.user!.userId, req.user!.phone, order.cityId, status ? "Updated Order Status" : "Assigned Rider", `Order #${order.id.slice(-6).toUpperCase()} updated to ${status || 'assigned'}`);
    
    res.json({ success: true, order: mi(updated!) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Shops Endpoints ───────────────────────────────────────────────────────────
router.get("/shops", authenticate, requireManager, checkCityAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  const cityId = String(req.query["cityId"]);
  try {
    const list = await db.select().from(shops).where(eq(shops.cityId, cityId)).orderBy(desc(shops.createdAt));
    res.json({ success: true, shops: miArr(list) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch("/shops/:id/status", authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  const { status } = req.body as { status: string };
  try {
    const [shop] = await db.select().from(shops).where(eq(shops.id, req.params["id"] as string)).limit(1);
    if (!shop) {
      res.status(404).json({ success: false, message: "Shop not found" });
      return;
    }

    const [updated] = await db.update(shops).set({ status, updatedAt: new Date() }).where(eq(shops.id, shop.id)).returning();
    
    await logAction(req.user!.userId, req.user!.phone, shop.cityId, "Updated Shop Status", `Shop ${shop.shopName} set to ${status}`);
    
    res.json({ success: true, shop: mi(updated!) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Customers Endpoints ──────────────────────────────────────────────────────
router.get("/customers", authenticate, requireManager, checkCityAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  const cityId = String(req.query["cityId"]);
  try {
    const list = await db.select().from(users).where(and(eq(users.cityId, cityId), eq(users.role, "customer"))).orderBy(users.name);
    res.json({ success: true, customers: miArr(list) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch("/customers/:id/status", authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  const { status } = req.body as { status: "active" | "suspended" };
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.params["id"] as string)).limit(1);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    await db.update(users).set({ status, updatedAt: new Date() }).where(eq(users.id, user.id));
    await logAction(req.user!.userId, req.user!.phone, user.cityId, status === "suspended" ? "Blocked Customer" : "Unblocked Customer", `User ${user.name || user.phone} set to ${status}`);
    
    res.json({ success: true, message: "Customer status updated" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Delivery Partners Endpoints ──────────────────────────────────────────────
router.get("/delivery", authenticate, requireManager, checkCityAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  const cityId = String(req.query["cityId"]);
  try {
    const list = await db.select().from(deliveryPartners).where(eq(deliveryPartners.cityId, cityId)).orderBy(deliveryPartners.name);
    res.json({ success: true, partners: miArr(list) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch("/delivery/:id/status", authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  const { status } = req.body as { status: "active" | "suspended" };
  try {
    const [partner] = await db.select().from(deliveryPartners).where(eq(deliveryPartners.id, req.params["id"] as string)).limit(1);
    if (!partner) {
      res.status(404).json({ success: false, message: "Delivery partner not found" });
      return;
    }

    const [updated] = await db.update(deliveryPartners).set({ status, updatedAt: new Date() }).where(eq(deliveryPartners.id, partner.id)).returning();
    await logAction(req.user!.userId, req.user!.phone, partner.cityId, "Updated Rider Status", `Rider ${partner.name} set to ${status}`);
    
    res.json({ success: true, partner: mi(updated!) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Payouts Endpoints ────────────────────────────────────────────────────────
router.get("/payouts", authenticate, requireManager, checkCityAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  const cityId = String(req.query["cityId"]);
  try {
    const list = await db.select().from(payouts).where(eq(payouts.cityId, cityId)).orderBy(desc(payouts.createdAt));
    res.json({ success: true, payouts: miArr(list) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/payouts/settle", authenticate, requireManager, checkCityAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  const { payoutId } = req.body as { payoutId: string };
  try {
    const [payout] = await db.select().from(payouts).where(eq(payouts.id, payoutId)).limit(1);
    if (!payout) {
      res.status(404).json({ success: false, message: "Payout not found" });
      return;
    }

    const [updated] = await db.update(payouts).set({ status: "completed", paidAt: new Date(), updatedAt: new Date() }).where(eq(payouts.id, payoutId)).returning();
    await logAction(req.user!.userId, req.user!.phone, payout.cityId, "Setted Payout", `Payout #${payout.id.slice(-6).toUpperCase()} set to completed`);
    
    res.json({ success: true, payout: mi(updated!) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Coupons Endpoints ────────────────────────────────────────────────────────
router.get("/coupons", authenticate, requireManager, checkCityAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  const cityId = String(req.query["cityId"]);
  try {
    const list = await db.select().from(coupons).where(eq(coupons.cityId, cityId)).orderBy(desc(coupons.createdAt));
    res.json({ success: true, coupons: miArr(list) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/coupons", authenticate, requireManager, checkCityAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  const { code, type, value, minimumOrder, maximumDiscount, expiryDate } = req.body as { code: string; type: string; value: number; minimumOrder: number; maximumDiscount?: number; expiryDate: string };
  const cityId = String(req.query["cityId"]);
  try {
    const [newCoupon] = await db.insert(coupons).values({
      code: code.toUpperCase().trim(),
      cityId,
      type,
      value,
      minimumOrder,
      maximumDiscount: maximumDiscount || null,
      expiryDate: new Date(expiryDate),
      isActive: true
    }).returning();

    await logAction(req.user!.userId, req.user!.phone, cityId, "Created Coupon", `Coupon ${code.toUpperCase()} created`);
    
    res.status(201).json({ success: true, coupon: mi(newCoupon!) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Support Tickets Endpoints ────────────────────────────────────────────────
router.get("/support", authenticate, requireManager, checkCityAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  const cityId = String(req.query["cityId"]);
  try {
    const list = await db.select().from(supportTickets).where(eq(supportTickets.cityId, cityId)).orderBy(desc(supportTickets.createdAt));
    res.json({ success: true, tickets: miArr(list) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch("/support/:id", authenticate, requireManager, async (req: AuthRequest, res: Response): Promise<void> => {
  const { adminNote, status } = req.body as { adminNote?: string; status?: "open" | "resolved" | "escalated" };
  try {
    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, req.params["id"] as string)).limit(1);
    if (!ticket) {
      res.status(404).json({ success: false, message: "Ticket not found" });
      return;
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (adminNote) updates.adminNote = adminNote;
    if (status) updates.status = status;

    const [updated] = await db.update(supportTickets).set(updates).where(eq(supportTickets.id, ticket.id)).returning();
    await logAction(req.user!.userId, req.user!.phone, ticket.cityId, "Resolved Ticket", `Ticket #${ticket.id.slice(-6).toUpperCase()} updated`);
    
    res.json({ success: true, ticket: mi(updated!) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Notifications Endpoints ──────────────────────────────────────────────────
router.post("/notifications", authenticate, requireManager, checkCityAccess, async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, message } = req.body as { title: string; message: string };
  const cityId = String(req.query["cityId"]);
  
  try {
    // Find all user IDs in this city
    const targetUsers = await db.select({ id: users.id }).from(users).where(and(eq(users.cityId, cityId), eq(users.role, "customer")));
    const userIds = targetUsers.map(u => u.id);
    
    if (userIds.length > 0) {
      // Trigger notifications using FCM/push
      await Promise.all(userIds.map(id => createNotificationLimited(id, {
        type: "system",
        title,
        message,
        data: { url: "/" }
      })));
    }
    
    await logAction(req.user!.userId, req.user!.phone, cityId, "Broadcasted Notification", `Title: ${title}`);
    
    res.json({ success: true, sentCount: userIds.length });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
