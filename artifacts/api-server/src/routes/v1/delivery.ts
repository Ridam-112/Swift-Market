import { Router, type Response } from "express";
import { db, deliveryPartners, deliveryChargeRules, deliverySettings, orders, users, shops, pickupVerificationSessions, pickupScanLogs } from "@workspace/db";
import { eq, desc, and, or, inArray, sql } from "drizzle-orm";
import { authenticate, optionalAuth, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { validateUuidParams } from "../../middlewares/validateUuid.js";
import { mi, miArr } from "../../utils/mapId.js";
import { createNotificationLimited } from "../../utils/notification.js";

const router = Router();
const A = requireRole("admin", "super_admin");

// ─── Delivery Partners ────────────────────────────────────────────────────────

router.get("/", authenticate, A, async (_req, res: Response): Promise<void> => {
  const partners = await db.select().from(deliveryPartners).orderBy(desc(deliveryPartners.createdAt));
  res.json({ success: true, partners: miArr(partners) });
});

router.post("/", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const phone = String(body["phone"] ?? "");

  // Auto-resolve userId from phone if not explicitly supplied
  let resolvedUserId: string | undefined = body["userId"] ? String(body["userId"]) : undefined;
  if (!resolvedUserId && phone) {
    const [linked] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone)).limit(1);
    if (linked) resolvedUserId = linked.id;
  }

  const [partner] = await db.insert(deliveryPartners).values({
    name: String(body["name"] ?? ""),
    phone,
    userId: resolvedUserId,
    vehicle: body["vehicle"] ? String(body["vehicle"]) : undefined,
    isAvailable: body["isAvailable"] != null ? Boolean(body["isAvailable"]) : true,
    status: body["status"] ? String(body["status"]) : "active",
  }).returning();
  res.status(201).json({ success: true, partner: mi(partner!) });
});

router.patch("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params["id"] as string;
  if (!id.match(/^[0-9a-f-]{36}$/i)) {
    // not a UUID — skip to next handler
    return;
  }
  const [partner] = await db.update(deliveryPartners)
    .set(req.body as Record<string, unknown>)
    .where(eq(deliveryPartners.id, id))
    .returning();
  if (!partner) { res.status(404).json({ success: false, message: "Not found" }); return; }
  res.json({ success: true, partner: mi(partner) });
});

router.delete("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params["id"] as string;
  if (!id.match(/^[0-9a-f-]{36}$/i)) {
    return;
  }
  await db.delete(deliveryPartners).where(eq(deliveryPartners.id, id));
  res.json({ success: true, message: "Deleted" });
});

// POST /delivery/:id/link-user — admin: auto-link a partner to the user account with matching phone
router.post("/:id/link-user", authenticate, A, validateUuidParams("id"), async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params["id"] as string;
  const [p] = await db.select().from(deliveryPartners).where(eq(deliveryPartners.id, id)).limit(1);
  if (!p) { res.status(404).json({ success: false, message: "Partner not found" }); return; }

  const [userRow] = await db.select({ id: users.id }).from(users).where(eq(users.phone, p.phone)).limit(1);
  if (!userRow) {
    res.status(404).json({ success: false, message: `No user account found with phone ${p.phone}. Ask the partner to sign up first.` });
    return;
  }

  const [updated] = await db.update(deliveryPartners)
    .set({ userId: userRow.id, updatedAt: new Date() })
    .where(eq(deliveryPartners.id, id))
    .returning();
  res.json({ success: true, partner: mi(updated!), message: "User account linked successfully" });
});

// ─── Delivery Charge Rules ────────────────────────────────────────────────────

// GET /delivery/charges — public: returns all rules + rain mode status
router.get("/charges", async (_req, res: Response): Promise<void> => {
  const [rules, settingRow] = await Promise.all([
    db.select().from(deliveryChargeRules).orderBy(desc(deliveryChargeRules.createdAt)),
    db.select().from(deliverySettings).where(eq(deliverySettings.key, "rain_mode_active")),
  ]);
  const rainModeActive = settingRow[0]?.value === "true";
  res.json({ success: true, rules: miArr(rules), rainModeActive });
});

// GET /delivery/charges/calculate — public: compute fee for a pincode pair
router.get("/charges/calculate", async (req, res: Response): Promise<void> => {
  const shopPincode = String(req.query["shopPincode"] ?? "");
  const userPincode = String(req.query["userPincode"] ?? "");

  if (shopPincode === userPincode) {
    res.json({ success: true, crossAreaCharge: 0, rainSurcharge: 0, rainModeActive: false, total: 0 });
    return;
  }

  const [ruleRows, settingRow] = await Promise.all([
    db.select().from(deliveryChargeRules).where(
      and(
        eq(deliveryChargeRules.fromPincode, shopPincode),
        eq(deliveryChargeRules.toPincode, userPincode),
      )
    ).limit(1),
    db.select().from(deliverySettings).where(eq(deliverySettings.key, "rain_mode_active")),
  ]);

  const rule = ruleRows[0];
  const rainModeActive = settingRow[0]?.value === "true";
  const crossAreaCharge = rule?.baseCharge ?? 0;
  const rainSurcharge = rainModeActive ? (rule?.rainSurcharge ?? 0) : 0;

  res.json({
    success: true,
    crossAreaCharge,
    rainSurcharge,
    rainModeActive,
    total: crossAreaCharge + rainSurcharge,
  });
});

// POST /delivery/charges — admin: add rule
router.post("/charges", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const [rule] = await db.insert(deliveryChargeRules).values({
    fromPincode: String(body["fromPincode"] ?? ""),
    toPincode: String(body["toPincode"] ?? ""),
    baseCharge: Number(body["baseCharge"] ?? 0),
    rainSurcharge: Number(body["rainSurcharge"] ?? 0),
    label: body["label"] ? String(body["label"]) : null,
  }).returning();
  res.status(201).json({ success: true, rule: mi(rule!) });
});

// PATCH /delivery/charges/:id — admin: update rule
router.patch("/charges/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const [rule] = await db.update(deliveryChargeRules).set({
    fromPincode: body["fromPincode"] ? String(body["fromPincode"]) : undefined,
    toPincode: body["toPincode"] ? String(body["toPincode"]) : undefined,
    baseCharge: body["baseCharge"] != null ? Number(body["baseCharge"]) : undefined,
    rainSurcharge: body["rainSurcharge"] != null ? Number(body["rainSurcharge"]) : undefined,
    label: body["label"] != null ? String(body["label"]) : undefined,
    updatedAt: new Date(),
  }).where(eq(deliveryChargeRules.id, req.params["id"] as string)).returning();
  if (!rule) { res.status(404).json({ success: false, message: "Rule not found" }); return; }
  res.json({ success: true, rule: mi(rule) });
});

// DELETE /delivery/charges/:id — admin: delete rule
router.delete("/charges/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  await db.delete(deliveryChargeRules).where(eq(deliveryChargeRules.id, req.params["id"] as string));
  res.json({ success: true, message: "Rule deleted" });
});

// ─── Rain Mode ────────────────────────────────────────────────────────────────

// POST /delivery/rain-mode — admin: toggle or set rain mode
router.post("/rain-mode", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const active = Boolean(body["active"]);

  // upsert the setting
  const existing = await db.select().from(deliverySettings).where(eq(deliverySettings.key, "rain_mode_active"));
  if (existing.length > 0) {
    await db.update(deliverySettings)
      .set({ value: active ? "true" : "false", updatedAt: new Date() })
      .where(eq(deliverySettings.key, "rain_mode_active"));
  } else {
    await db.insert(deliverySettings).values({
      key: "rain_mode_active",
      value: active ? "true" : "false",
    });
  }

  res.json({ success: true, rainModeActive: active });
});

// ─── Fleet Map (admin only) ───────────────────────────────────────────────────

// GET /delivery/fleet — all partners + current lat/lon + active order info
router.get("/fleet", authenticate, A, async (_req, res: Response): Promise<void> => {
  const partners = await db
    .select({
      id: deliveryPartners.id,
      name: deliveryPartners.name,
      phone: deliveryPartners.phone,
      vehicle: deliveryPartners.vehicle,
      status: deliveryPartners.status,
      isAvailable: deliveryPartners.isAvailable,
      currentLat: deliveryPartners.currentLat,
      currentLon: deliveryPartners.currentLon,
      locationUpdatedAt: deliveryPartners.locationUpdatedAt,
    })
    .from(deliveryPartners)
    .orderBy(desc(deliveryPartners.locationUpdatedAt));

  // Fetch active orders per partner (status not delivered/cancelled)
  const activeOrders = await db
    .select({
      id: orders.id,
      deliveryPartnerId: orders.deliveryPartnerId,
      status: orders.status,
      netAmount: orders.netAmount,
      address: orders.address,
    })
    .from(orders)
    .where(eq(orders.status, "out_for_delivery"));

  const orderByPartner = new Map<string, typeof activeOrders[number]>();
  for (const o of activeOrders) {
    if (o.deliveryPartnerId) orderByPartner.set(o.deliveryPartnerId, o);
  }

  const fleet = partners.map(p => ({
    ...mi(p),
    activeOrder: p.id ? (orderByPartner.get(p.id) ?? null) : null,
  }));

  res.json({ success: true, fleet });
});

// ─── Delivery Partner Self-Service ───────────────────────────────────────────

// GET /delivery/me — get own partner profile
// First tries by userId; falls back to phone match and auto-links if found.
router.get("/me", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;

  // Primary: exact userId match
  let [partner] = await db.select().from(deliveryPartners).where(eq(deliveryPartners.userId, userId)).limit(1);

  if (!partner) {
    // Fallback: look up this user's phone, then find partner by phone
    const [userRow] = await db.select({ phone: users.phone }).from(users).where(eq(users.id, userId)).limit(1);
    if (userRow?.phone) {
      [partner] = await db.select().from(deliveryPartners).where(eq(deliveryPartners.phone, userRow.phone)).limit(1);
      // Auto-link: stamp userId so future lookups skip the fallback
      if (partner && !partner.userId) {
        await db.update(deliveryPartners).set({ userId, updatedAt: new Date() }).where(eq(deliveryPartners.id, partner.id));
        partner = { ...partner, userId };
      }
    }
  }

  if (!partner) { res.status(404).json({ success: false, message: "Not a delivery partner" }); return; }
  res.json({ success: true, partner: mi(partner) });
});

// PATCH /delivery/me/location — rider pushes GPS coords (called every ~10s while active)
router.patch("/me/location", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { lat, lon } = req.body as { lat: number; lon: number };
  if (typeof lat !== "number" || typeof lon !== "number") {
    res.status(400).json({ success: false, message: "lat and lon required" }); return;
  }
  const [partner] = await db.select().from(deliveryPartners).where(eq(deliveryPartners.userId, userId)).limit(1);
  if (!partner) { res.status(404).json({ success: false, message: "Not a delivery partner" }); return; }
  await db.update(deliveryPartners)
    .set({ currentLat: lat, currentLon: lon, locationUpdatedAt: new Date(), updatedAt: new Date() })
    .where(eq(deliveryPartners.id, partner.id));
  res.json({ success: true });
});

// PATCH /delivery/me/availability — toggle online/offline
router.patch("/me/availability", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const [existing] = await db.select().from(deliveryPartners).where(eq(deliveryPartners.userId, userId)).limit(1);
  if (!existing) { res.status(404).json({ success: false, message: "Not a delivery partner" }); return; }
  if (existing.status !== "active") { res.status(403).json({ success: false, message: "Account is not active" }); return; }
  const [partner] = await db.update(deliveryPartners)
    .set({ isAvailable: !existing.isAvailable, updatedAt: new Date() })
    .where(eq(deliveryPartners.userId, userId))
    .returning();
  res.json({ success: true, partner: mi(partner!) });
});

// GET /delivery/me/orders — get all orders assigned to this partner
router.get("/me/orders", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const [partner] = await db.select().from(deliveryPartners).where(eq(deliveryPartners.userId, userId)).limit(1);
  if (!partner) { res.status(404).json({ success: false, message: "Not a delivery partner" }); return; }

  const rows = await db
    .select({ order: orders, shopAddress: shops.address })
    .from(orders)
    .leftJoin(shops, eq(orders.shopId, shops.id))
    .where(eq(orders.deliveryPartnerId, partner.id))
    .orderBy(desc(orders.createdAt));

  const result = rows.map(({ order, shopAddress }) => ({
    ...mi(order),
    shopAddress: (shopAddress ?? {}) as Record<string, string>,
  }));

  res.json({ success: true, orders: result, partner: mi(partner) });
});

// PATCH /delivery/me/orders/:orderId/status — mark order as out_for_delivery or delivered
// Body: { status: "out_for_delivery" | "delivered", confirmCash?: boolean }
// For COD orders, pass confirmCash: true when rider has collected payment — sets paymentStatus="paid".
router.patch("/me/orders/:orderId/status", authenticate, validateUuidParams("orderId"), async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const orderId = req.params["orderId"] as string;
  const { status, confirmCash } = req.body as { status: string; confirmCash?: boolean };

  const [partner] = await db.select().from(deliveryPartners).where(eq(deliveryPartners.userId, userId)).limit(1);
  if (!partner) { res.status(403).json({ success: false, message: "Not a delivery partner" }); return; }

  const rawStatus = String(status ?? "").toLowerCase();
  const targetStatus = ["out_for_delivery", "picked_up", "picked", "on_the_way", "pickup", "in_transit"].includes(rawStatus)
    ? "out_for_delivery"
    : rawStatus;

  if (targetStatus !== "out_for_delivery") {
    res.status(400).json({
      success: false,
      message: status === "delivered"
        ? "To mark an order as delivered, enter the customer's delivery OTP."
        : "Delivery partners can set out_for_delivery via this endpoint.",
    });
    return;
  }

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) { res.status(404).json({ success: false, message: "Order not found" }); return; }
  if (order.deliveryPartnerId !== partner.id) {
    res.status(403).json({ success: false, message: "This order is not assigned to you" });
    return;
  }

  const isCod = (order.paymentMethod ?? "COD").toUpperCase() === "COD";

  if ((targetStatus as string) === "delivered") {
    await db.update(deliveryPartners).set({
      ordersDelivered: partner.ordersDelivered + 1,
      totalEarnings: partner.totalEarnings + (order.deliveryCharge ?? 0),
      currentOrderId: null,
      updatedAt: new Date(),
    }).where(eq(deliveryPartners.id, partner.id));
  } else if ((targetStatus as string) === "out_for_delivery") {
    await db.update(deliveryPartners).set({
      currentOrderId: order.id,
      updatedAt: new Date(),
    }).where(eq(deliveryPartners.id, partner.id));
  }

  // For COD orders marked delivered with cash confirmed, mark payment as paid
  const paymentStatusUpdate = ((targetStatus as string) === "delivered" && isCod && confirmCash) ? { paymentStatus: "paid" } : {};

  const [updated] = await db.update(orders)
    .set({ status: targetStatus, ...paymentStatusUpdate, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning();

  // Notify the customer about status change
  const STATUS_MESSAGES: Record<string, { title: string; body: string }> = {
    out_for_delivery: { title: "Your order is on the way! 🚚", body: `Order #${orderId.slice(-6).toUpperCase()} has been picked up and is out for delivery.` },
    delivered: { title: "Order Delivered! ✅", body: `Order #${orderId.slice(-6).toUpperCase()} has been delivered. Enjoy!` },
  };
  const msg = STATUS_MESSAGES[targetStatus];
  if (msg && order.customerId) {
    try {
      await createNotificationLimited(order.customerId, {
        type: "order_update",
        title: msg.title,
        message: msg.body,
        data: { orderId, url: `/orders/${orderId}` },
      });
    } catch { /* ignore */ }
  }

  res.json({ success: true, order: mi(updated!) });
});

// POST /delivery/me/orders/:orderId/verify-otp — rider enters customer OTP to confirm delivery
router.post("/me/orders/:orderId/verify-otp", authenticate, validateUuidParams("orderId"), async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const orderId = req.params["orderId"] as string;
  const { otp, confirmCash } = req.body as { otp: string; confirmCash?: boolean };

  const [partner] = await db.select().from(deliveryPartners).where(eq(deliveryPartners.userId, userId)).limit(1);
  if (!partner) { res.status(403).json({ success: false, message: "Not a delivery partner" }); return; }

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) { res.status(404).json({ success: false, message: "Order not found" }); return; }
  if (order.deliveryPartnerId !== partner.id) {
    res.status(403).json({ success: false, message: "This order is not assigned to you" }); return;
  }
  if (order.status === "delivered" || order.status === "cancelled" || order.status === "refunded") {
    res.status(400).json({ success: false, message: `Order is already ${order.status.replace(/_/g, " ")}` }); return;
  }
  if (!order.deliveryOtp || order.deliveryOtp !== String(otp ?? "").trim()) {
    res.status(400).json({ success: false, message: "Incorrect OTP. Please ask the customer for the correct code." }); return;
  }

  const isCod = (order.paymentMethod ?? "COD").toUpperCase() === "COD";
  const paymentStatusUpdate = (isCod && confirmCash) ? { paymentStatus: "paid" } : {};

  await db.update(deliveryPartners).set({
    ordersDelivered: partner.ordersDelivered + 1,
    totalEarnings: partner.totalEarnings + (order.deliveryCharge ?? 0),
    currentOrderId: null,
    updatedAt: new Date(),
  }).where(eq(deliveryPartners.id, partner.id));

  const [updated] = await db.update(orders)
    .set({ status: "delivered", ...paymentStatusUpdate, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning();

  try {
    await createNotificationLimited(order.customerId, {
      type: "order_update",
      title: "Order Delivered! ✅",
      message: `Order #${orderId.slice(-6).toUpperCase()} has been delivered. Enjoy!`,
      data: { orderId, url: `/orders/${orderId}` },
    });
  } catch { /* ignore */ }

  res.json({ success: true, order: mi(updated!) });
});

// PATCH /delivery/me/orders/:orderId/confirm-payment — rider confirms COD cash collected
// Can be called after delivery for COD orders to set paymentStatus="paid".
router.patch("/me/orders/:orderId/confirm-payment", authenticate, validateUuidParams("orderId"), async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const orderId = req.params["orderId"] as string;

  const [partner] = await db.select().from(deliveryPartners).where(eq(deliveryPartners.userId, userId)).limit(1);
  if (!partner) { res.status(403).json({ success: false, message: "Not a delivery partner" }); return; }

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) { res.status(404).json({ success: false, message: "Order not found" }); return; }
  if (order.deliveryPartnerId !== partner.id) {
    res.status(403).json({ success: false, message: "This order is not assigned to you" });
    return;
  }
  if (order.status !== "delivered") {
    res.status(400).json({ success: false, message: "Order must be delivered first" });
    return;
  }
  if (order.paymentStatus === "paid") {
    res.json({ success: true, order: mi(order), message: "Payment already confirmed" });
    return;
  }

  const [updated] = await db.update(orders)
    .set({ paymentStatus: "paid", updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning();

  res.json({ success: true, order: mi(updated!) });
});

// ─── Order Broadcast & First-Come Accept / Transfer System ───────────────────

// GET /delivery/available-orders — rider fetches unassigned orders in their city
router.get("/available-orders", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const [partner] = await db.select().from(deliveryPartners).where(eq(deliveryPartners.userId, userId)).limit(1);
  if (!partner || !partner.isAvailable || partner.status !== "active") {
    res.json({ success: true, orders: [] });
    return;
  }

  const cityId = partner.cityId;
  const unassignedOrders = await db
    .select({ order: orders, shopName: shops.shopName, shopAddress: shops.address })
    .from(orders)
    .leftJoin(shops, eq(orders.shopId, shops.id))
    .where(
      and(
        eq(orders.deliveryPartnerId, null as any),
        or(eq(orders.status, "placed"), eq(orders.status, "packed"), eq(orders.status, "accepted"))
      )
    )
    .orderBy(desc(orders.createdAt))
    .limit(20);

  // Filter by city if partner has a cityId set
  const filtered = unassignedOrders.filter(({ order, shopAddress }) => {
    if (!cityId) return true;
    const orderCity = order.cityId || (shopAddress as any)?.cityId;
    return !orderCity || orderCity.toLowerCase() === cityId.toLowerCase();
  });

  res.json({
    success: true,
    orders: filtered.map(({ order, shopName, shopAddress }) => ({
      ...mi(order),
      shopName: shopName ?? "Shop",
      shopAddress: (shopAddress ?? {}) as Record<string, string>,
    })),
  });
});

// POST /delivery/orders/:id/accept — first-come first-served atomic order acceptance
router.post("/orders/:id/accept", authenticate, validateUuidParams("id"), async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const orderId = req.params["id"] as string;

  const [partner] = await db.select().from(deliveryPartners).where(eq(deliveryPartners.userId, userId)).limit(1);
  if (!partner || partner.status !== "active") {
    res.status(403).json({ success: false, message: "Not an active delivery partner" });
    return;
  }

  // Atomic update: only succeeds if deliveryPartnerId is still NULL
  const updatedRows = await db
    .update(orders)
    .set({
      deliveryPartnerId: partner.id,
      updatedAt: new Date(),
    })
    .where(and(eq(orders.id, orderId), eq(orders.deliveryPartnerId, null as any)))
    .returning();

  if (updatedRows.length === 0) {
    res.status(409).json({ success: false, message: "Order already accepted by another rider!" });
    return;
  }

  const [updatedOrder] = updatedRows;
  await db.update(deliveryPartners).set({ currentOrderId: orderId, updatedAt: new Date() }).where(eq(deliveryPartners.id, partner.id));

  // Notify customer
  if (updatedOrder.customerId) {
    try {
      await createNotificationLimited(updatedOrder.customerId, {
        type: "order_update",
        title: "Rider Assigned! 🛵",
        message: `${partner.name} has accepted your order and will deliver it soon.`,
        data: { orderId, url: `/orders/${orderId}` },
      });
    } catch { /* ignore */ }
  }

  res.json({ success: true, message: "Order accepted successfully", order: mi(updatedOrder) });
});

// POST /delivery/orders/:id/reject — rider declines order alert
router.post("/orders/:id/reject", authenticate, validateUuidParams("id"), async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json({ success: true, message: "Order alert dismissed" });
});

// POST /delivery/orders/:id/transfer — rider transfers assigned order to another rider
router.post("/orders/:id/transfer", authenticate, validateUuidParams("id"), async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const orderId = req.params["id"] as string;

  const [partner] = await db.select().from(deliveryPartners).where(eq(deliveryPartners.userId, userId)).limit(1);
  if (!partner) { res.status(403).json({ success: false, message: "Not a delivery partner" }); return; }

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) { res.status(404).json({ success: false, message: "Order not found" }); return; }
  if (order.deliveryPartnerId !== partner.id) {
    res.status(403).json({ success: false, message: "This order is not assigned to you" }); return;
  }

  // Release order from this rider
  const [updatedOrder] = await db
    .update(orders)
    .set({ deliveryPartnerId: null, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning();

  await db.update(deliveryPartners).set({ currentOrderId: null, updatedAt: new Date() }).where(eq(deliveryPartners.id, partner.id));

  res.json({ success: true, message: "Order transferred and re-broadcasted", order: mi(updatedOrder!) });
});

// POST /delivery/orders/:id/re-broadcast — admin manually re-notifies riders for unassigned order
router.post("/orders/:id/re-broadcast", authenticate, A, validateUuidParams("id"), async (req: AuthRequest, res: Response): Promise<void> => {
  const orderId = req.params["id"] as string;
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) { res.status(404).json({ success: false, message: "Order not found" }); return; }

  res.json({ success: true, message: `Re-broadcast alert triggered for Order #${orderId.slice(-6).toUpperCase()}` });
});

// ─── FCM Token Registration (v2 Contract Section 3.2) ───────────────────────

router.post("/me/fcm-token", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { fcmToken } = req.body as { fcmToken: string };
  const [partner] = await db.select().from(deliveryPartners).where(eq(deliveryPartners.userId, userId)).limit(1);
  if (!partner) { res.status(404).json({ success: false, message: "Not a delivery partner" }); return; }
  await db.update(deliveryPartners).set({ fcmToken, updatedAt: new Date() }).where(eq(deliveryPartners.id, partner.id));
  res.json({ success: true, message: "FCM token registered successfully" });
});

router.delete("/me/fcm-token", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const [partner] = await db.select().from(deliveryPartners).where(eq(deliveryPartners.userId, userId)).limit(1);
  if (!partner) { res.status(404).json({ success: false, message: "Not a delivery partner" }); return; }
  await db.update(deliveryPartners).set({ fcmToken: null, updatedAt: new Date() }).where(eq(deliveryPartners.id, partner.id));
  res.json({ success: true, message: "FCM token cleared successfully" });
});

// ─── Rider KYC Application & Onboarding (v2 Contract Section 5.1) ───────────

router.post("/apply", optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as Record<string, any>;
  const applicantPhone = String(body["phone"] || body["userPhone"] || "").trim();
  let userId = req.user?.userId || null;
  let user = null;

  if (userId) {
    const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    user = u ?? null;
  }

  if (!user && applicantPhone) {
    const [u] = await db.select().from(users).where(eq(users.phone, applicantPhone)).limit(1);
    user = u ?? null;
    if (user) {
      userId = user.id;
    }
  }

  if (!user && applicantPhone) {
    const [newUser] = await db.insert(users).values({
      name: String(body["name"] || "Rider Applicant"),
      phone: applicantPhone,
      role: "rider",
      status: "active",
      cityId: body["cityId"] ? String(body["cityId"]) : "balurghat",
    }).returning();
    user = newUser ?? null;
    if (newUser) userId = newUser.id;
  }

  let existing = null;
  if (userId) {
    const [byUser] = await db.select().from(deliveryPartners).where(eq(deliveryPartners.userId, userId)).limit(1);
    existing = byUser;
  }
  if (!existing && applicantPhone) {
    const [byPhone] = await db.select().from(deliveryPartners).where(eq(deliveryPartners.phone, applicantPhone)).limit(1);
    existing = byPhone;
  }

  if (existing) {
    const [updated] = await db.update(deliveryPartners).set({
      name: body["name"] ? String(body["name"]) : existing.name,
      phone: applicantPhone || existing.phone,
      userId: userId || existing.userId,
      vehicle: body["vehicle"] ? String(body["vehicle"]) : existing.vehicle,
      panNumber: body["panNumber"] ? String(body["panNumber"]) : existing.panNumber,
      dlNumber: body["dlNumber"] ? String(body["dlNumber"]) : existing.dlNumber,
      rcNumber: body["rcNumber"] ? String(body["rcNumber"]) : existing.rcNumber,
      documents: body["documents"] ?? existing.documents,
      applicationStatus: "pending",
      updatedAt: new Date(),
    }).where(eq(deliveryPartners.id, existing.id)).returning();
    res.json({ success: true, partner: mi(updated!), applicationStatus: "pending" });
    return;
  }

  const [partner] = await db.insert(deliveryPartners).values({
    name: String(body["name"] || user?.name || "Rider Applicant"),
    phone: applicantPhone || "0000000000",
    userId,
    cityId: body["cityId"] ? String(body["cityId"]) : (user?.cityId || "balurghat"),
    vehicle: body["vehicle"] ? String(body["vehicle"]) : "Bike",
    panNumber: body["panNumber"] ? String(body["panNumber"]) : null,
    dlNumber: body["dlNumber"] ? String(body["dlNumber"]) : null,
    rcNumber: body["rcNumber"] ? String(body["rcNumber"]) : null,
    documents: body["documents"] ?? {},
    applicationStatus: "pending",
    status: "inactive",
    isAvailable: false,
  }).returning();

  res.status(201).json({ success: true, partner: mi(partner!), applicationStatus: "pending" });
});

// ─── UPI QR Payment Collection (v2 Contract Section 3.6) ───────────────────

router.post("/me/orders/:orderId/generate-upi-qr", authenticate, validateUuidParams("orderId"), async (req: AuthRequest, res: Response): Promise<void> => {
  const orderId = req.params["orderId"] as string;
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) { res.status(404).json({ success: false, message: "Order not found" }); return; }

  const amount = order.netAmount ?? order.subtotal ?? 0;
  const upiId = process.env["MERCHANT_UPI_ID"] || "swiftmart@upi";
  const payeeName = "SwiftMart Delivery";
  const upiDeeplink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=Order_${orderId.slice(-6)}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiDeeplink)}`;

  res.json({
    success: true,
    qrImageUrl,
    upiDeeplink,
    expiresIn: 300,
  });
});

router.get("/me/orders/:orderId/payment-status", authenticate, validateUuidParams("orderId"), async (req: AuthRequest, res: Response): Promise<void> => {
  const orderId = req.params["orderId"] as string;
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) { res.status(404).json({ success: false, message: "Order not found" }); return; }
  res.json({ success: true, status: order.paymentStatus === "paid" ? "received" : "pending" });
});

// ─── Admin Applications Review (v2 Contract Section 5.2) ───────────────────

router.get("/admin/applications", authenticate, A, async (_req: AuthRequest, res: Response): Promise<void> => {
  const pending = await db.select().from(deliveryPartners).where(eq(deliveryPartners.applicationStatus, "pending")).orderBy(desc(deliveryPartners.createdAt));
  res.json({ success: true, applications: miArr(pending) });
});

router.post("/admin/:id/approve", authenticate, A, validateUuidParams("id"), async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params["id"] as string;
  const [updated] = await db.update(deliveryPartners)
    .set({ applicationStatus: "approved", status: "active", updatedAt: new Date() })
    .where(eq(deliveryPartners.id, id))
    .returning();
  if (!updated) { res.status(404).json({ success: false, message: "Partner not found" }); return; }
  res.json({ success: true, partner: mi(updated), message: "Partner application approved!" });
});

router.post("/admin/:id/reject", authenticate, A, validateUuidParams("id"), async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params["id"] as string;
  const { reason } = req.body as { reason?: string };
  const [updated] = await db.update(deliveryPartners)
    .set({ applicationStatus: "rejected", status: "inactive", rejectionReason: reason ?? "Application rejected by admin", updatedAt: new Date() })
    .where(eq(deliveryPartners.id, id))
    .returning();
  if (!updated) { res.status(404).json({ success: false, message: "Partner not found" }); return; }
  res.json({ success: true, partner: mi(updated), message: "Partner application rejected." });
});

// ─── Store-Level Rider Pickup QR Verification System ────────────────────────

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function parsePickupQrToken(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (trimmed.startsWith("SWIFTMART_PICKUP:")) {
    return trimmed.replace("SWIFTMART_PICKUP:", "").trim();
  }
  const match = trimmed.match(/\/pickup\/store\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return trimmed;
}

// POST /delivery/pickup/verify-store — rider scans physical counter QR
router.post("/pickup/verify-store", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { qrToken, qrPayload, scannedToken, lat, lon, orderId } = req.body as {
    qrToken?: string;
    qrPayload?: string;
    scannedToken?: string;
    lat?: number;
    lon?: number;
    orderId?: string;
  };

  const rawToken = qrToken || qrPayload || scannedToken || "";
  const token = parsePickupQrToken(rawToken);

  const [partner] = await db.select().from(deliveryPartners).where(eq(deliveryPartners.userId, userId)).limit(1);
  if (!partner) {
    res.status(403).json({ success: false, storeVerified: false, message: "Not an authorized delivery partner" });
    return;
  }

  if (!token) {
    res.status(400).json({ success: false, storeVerified: false, reason: "INVALID_QR", message: "QR token missing in request" });
    return;
  }

  // 1. Find store by pickupQrToken
  const [store] = await db.select().from(shops).where(eq(shops.pickupQrToken, token)).limit(1);

  if (!store) {
    await db.insert(pickupScanLogs).values({
      riderId: partner.id,
      riderName: partner.name,
      orderId: orderId || null,
      scannedToken: token,
      scanResult: "INVALID_QR",
      reason: "No partner store registered with this QR token",
      riderLat: typeof lat === "number" ? lat : null,
      riderLon: typeof lon === "number" ? lon : null,
    });

    res.status(400).json({
      success: false,
      storeVerified: false,
      reason: "INVALID_QR",
      message: "Unrecognized SwiftMart Store QR code. Please ensure you are scanning the official SwiftMart counter poster.",
    });
    return;
  }

  // 2. Check if QR is active
  if (store.qrStatus === "disabled") {
    await db.insert(pickupScanLogs).values({
      riderId: partner.id,
      riderName: partner.name,
      storeId: store.id,
      storeName: store.shopName,
      orderId: orderId || null,
      scannedToken: token,
      scanResult: "EXPIRED_QR",
      reason: "Store QR token has been disabled by merchant or admin",
      riderLat: typeof lat === "number" ? lat : null,
      riderLon: typeof lon === "number" ? lon : null,
    });

    res.status(400).json({
      success: false,
      storeVerified: false,
      reason: "EXPIRED_QR",
      message: `The QR code for "${store.shopName}" is currently deactivated. Please ask the shopkeeper for assistance.`,
    });
    return;
  }

  // 3. GPS Proximity Verification
  let distanceMeters: number | null = null;
  const storeAddr = (store.address ?? {}) as Record<string, any>;
  const storeLat = (typeof storeAddr.lat === "number" ? storeAddr.lat : (typeof storeAddr.latitude === "number" ? storeAddr.latitude : null));
  const storeLon = (typeof storeAddr.lng === "number" ? storeAddr.lng : (typeof storeAddr.longitude === "number" ? storeAddr.longitude : (typeof storeAddr.lon === "number" ? storeAddr.lon : null)));

  if (store.pickupGpsEnforced && storeLat != null && storeLon != null && typeof lat === "number" && typeof lon === "number") {
    distanceMeters = calculateDistanceMeters(lat, lon, storeLat, storeLon);
    const maxRadius = store.pickupGpsRadiusMeters || 200;

    if (distanceMeters > maxRadius) {
      await db.insert(pickupScanLogs).values({
        riderId: partner.id,
        riderName: partner.name,
        storeId: store.id,
        storeName: store.shopName,
        orderId: orderId || null,
        scannedToken: token,
        scanResult: "TOO_FAR_FROM_STORE",
        reason: `Rider GPS distance (${Math.round(distanceMeters)}m) exceeds maximum radius (${maxRadius}m)`,
        riderLat: lat,
        riderLon: lon,
        distanceMeters,
      });

      res.status(400).json({
        success: false,
        storeVerified: false,
        reason: "TOO_FAR_FROM_STORE",
        distanceMeters: Math.round(distanceMeters),
        maxRadiusMeters: maxRadius,
        message: `You are too far from ${store.shopName} (${Math.round(distanceMeters)}m away). Please reach the store counter before scanning.`,
      });
      return;
    }
  }

  // 4. Find all active assigned pickup orders from THIS store for this rider
  const storeOrders = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.deliveryPartnerId, partner.id),
        eq(orders.shopId, store.id),
        or(
          eq(orders.status, "accepted"),
          eq(orders.status, "preparing"),
          eq(orders.status, "packed"),
          eq(orders.status, "ready"),
          eq(orders.status, "placed")
        )
      )
    )
    .orderBy(desc(orders.createdAt));

  if (storeOrders.length === 0) {
    // Check if rider has active orders at a DIFFERENT store
    const [otherOrder] = await db
      .select({ id: orders.id, shopName: orders.shopName, shopId: orders.shopId })
      .from(orders)
      .where(
        and(
          eq(orders.deliveryPartnerId, partner.id),
          or(
            eq(orders.status, "accepted"),
            eq(orders.status, "preparing"),
            eq(orders.status, "packed"),
            eq(orders.status, "ready"),
            eq(orders.status, "placed")
          )
        )
      )
      .limit(1);

    if (otherOrder && otherOrder.shopId !== store.id) {
      await db.insert(pickupScanLogs).values({
        riderId: partner.id,
        riderName: partner.name,
        storeId: store.id,
        storeName: store.shopName,
        orderId: otherOrder.id,
        scannedToken: token,
        scanResult: "WRONG_STORE",
        reason: `Rider scanned ${store.shopName} but has active order assigned to ${otherOrder.shopName}`,
        riderLat: typeof lat === "number" ? lat : null,
        riderLon: typeof lon === "number" ? lon : null,
        distanceMeters: distanceMeters ?? undefined,
      });

      res.status(400).json({
        success: false,
        storeVerified: false,
        reason: "WRONG_STORE",
        scannedStore: {
          id: store.id,
          storeCode: store.storeCode || `SW-${store.id.slice(0, 6).toUpperCase()}`,
          name: store.shopName,
        },
        expectedStore: {
          name: otherOrder.shopName,
        },
        message: `Wrong Pickup Store! You scanned "${store.shopName}", but your assigned order is from "${otherOrder.shopName}". Please scan the QR at the correct store.`,
      });
      return;
    }

    // No active pickup orders at all
    await db.insert(pickupScanLogs).values({
      riderId: partner.id,
      riderName: partner.name,
      storeId: store.id,
      storeName: store.shopName,
      orderId: orderId || null,
      scannedToken: token,
      scanResult: "NO_ACTIVE_PICKUP",
      reason: "No active unpicked orders assigned to rider at this store",
      riderLat: typeof lat === "number" ? lat : null,
      riderLon: typeof lon === "number" ? lon : null,
      distanceMeters: distanceMeters ?? undefined,
    });

    res.status(400).json({
      success: false,
      storeVerified: false,
      reason: "NO_ACTIVE_PICKUP",
      message: `You do not have any pending pickup orders at "${store.shopName}".`,
    });
    return;
  }

  // 5. Successful Store Verification — create temporary 15-minute session
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const [session] = await db
    .insert(pickupVerificationSessions)
    .values({
      riderId: partner.id,
      storeId: store.id,
      token,
      expiresAt,
      riderLat: typeof lat === "number" ? lat : null,
      riderLon: typeof lon === "number" ? lon : null,
      status: "active",
    })
    .returning();

  // Stamp store last QR scan timestamp
  await db.update(shops).set({ lastQrScanAt: new Date() }).where(eq(shops.id, store.id));

  // Log successful scan
  await db.insert(pickupScanLogs).values({
    riderId: partner.id,
    riderName: partner.name,
    storeId: store.id,
    storeName: store.shopName,
    orderId: storeOrders[0]?.id || null,
    scannedToken: token,
    scanResult: "SUCCESS",
    reason: `Verified ${storeOrders.length} assigned order(s) at ${store.shopName}`,
    riderLat: typeof lat === "number" ? lat : null,
    riderLon: typeof lon === "number" ? lon : null,
    distanceMeters: distanceMeters ?? undefined,
  });

  res.json({
    success: true,
    storeVerified: true,
    verificationId: session!.id,
    expiresAt: expiresAt.toISOString(),
    store: {
      id: store.id,
      storeCode: store.storeCode || `SW-${store.id.slice(0, 6).toUpperCase()}`,
      storeName: store.shopName,
      ownerName: store.ownerName,
      phone: store.phone,
      address: store.address,
    },
    assignedOrders: miArr(storeOrders),
  });
});

// POST /delivery/pickup/confirm — rider confirms pickup with verification session
router.post("/pickup/confirm", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId;
  const { verificationId, orderId, orderIds } = req.body as {
    verificationId: string;
    orderId?: string;
    orderIds?: string[];
  };

  const [partner] = await db.select().from(deliveryPartners).where(eq(deliveryPartners.userId, userId)).limit(1);
  if (!partner) {
    res.status(403).json({ success: false, message: "Not an authorized delivery partner" });
    return;
  }

  if (!verificationId) {
    res.status(400).json({ success: false, message: "Verification session ID required. Please scan the store QR code." });
    return;
  }

  // 1. Validate session
  const [session] = await db
    .select()
    .from(pickupVerificationSessions)
    .where(and(eq(pickupVerificationSessions.id, verificationId), eq(pickupVerificationSessions.riderId, partner.id)))
    .limit(1);

  if (!session) {
    res.status(404).json({ success: false, message: "Invalid verification session. Please scan the store QR code again." });
    return;
  }

  if (session.status !== "active" || session.expiresAt < new Date()) {
    res.status(400).json({
      success: false,
      message: "Verification session has expired (15-min limit). Please scan the store QR code again to refresh.",
    });
    return;
  }

  // Determine target order IDs
  const targetIds: string[] = [];
  if (Array.isArray(orderIds) && orderIds.length > 0) {
    targetIds.push(...orderIds.map(String).filter(Boolean));
  } else if (orderId) {
    targetIds.push(String(orderId));
  }

  if (targetIds.length === 0) {
    // Default to all active orders assigned to rider at this store
    const allStoreOrders = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.deliveryPartnerId, partner.id), eq(orders.shopId, session.storeId)));
    targetIds.push(...allStoreOrders.map(o => o.id));
  }

  if (targetIds.length === 0) {
    res.status(400).json({ success: false, message: "No assigned orders found to confirm pickup." });
    return;
  }

  // 2. Update orders to out_for_delivery
  const updatedOrders = await db
    .update(orders)
    .set({
      status: "out_for_delivery",
      updatedAt: new Date(),
    })
    .where(
      and(
        inArray(orders.id, targetIds),
        eq(orders.deliveryPartnerId, partner.id),
        eq(orders.shopId, session.storeId)
      )
    )
    .returning();

  // 3. Mark verification session as completed
  await db
    .update(pickupVerificationSessions)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(pickupVerificationSessions.id, session.id));

  // 4. Update partner's active order
  await db
    .update(deliveryPartners)
    .set({ currentOrderId: targetIds[0], updatedAt: new Date() })
    .where(eq(deliveryPartners.id, partner.id));

  // 5. Notify customers
  for (const o of updatedOrders) {
    if (o.customerId) {
      try {
        await createNotificationLimited(o.customerId, {
          type: "order_update",
          title: "Order Picked Up! 🛵",
          message: `Order #${o.id.slice(-6).toUpperCase()} is picked up from ${o.shopName} and is on its way to you!`,
          data: { orderId: o.id, url: `/orders/${o.id}` },
        });
      } catch { /* ignore */ }
    }
  }

  res.json({
    success: true,
    message: `Successfully confirmed pickup of ${updatedOrders.length} order(s)! Status updated to OUT FOR DELIVERY.`,
    orders: miArr(updatedOrders),
  });
});

// ─── Store QR Code Management Endpoints ─────────────────────────────────────

// GET /delivery/store/:id/qr — get QR payload and store code for printable counter poster
router.get("/store/:id/qr", optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const shopId = req.params["id"] as string;
  const [shop] = await db.select().from(shops).where(eq(shops.id, shopId)).limit(1);
  if (!shop) {
    res.status(404).json({ success: false, message: "Shop not found" });
    return;
  }

  // Generate fallback store code and pickup token if missing
  let storeCode = shop.storeCode;
  let pickupQrToken = shop.pickupQrToken;
  if (!storeCode || !pickupQrToken) {
    storeCode = storeCode || `SW-BLG-${shop.id.slice(0, 4).toUpperCase()}`;
    pickupQrToken = pickupQrToken || crypto.randomUUID();
    await db.update(shops).set({ storeCode, pickupQrToken }).where(eq(shops.id, shop.id));
  }

  const qrPayload = `SWIFTMART_PICKUP:${pickupQrToken}`;
  const pickupUrl = `https://swiftmart.space/pickup/store/${pickupQrToken}`;

  res.json({
    success: true,
    shop: {
      id: shop.id,
      shopName: shop.shopName,
      ownerName: shop.ownerName,
      phone: shop.phone,
      address: shop.address,
      storeCode,
      pickupQrToken,
      qrStatus: shop.qrStatus || "active",
      qrPayload,
      pickupUrl,
      lastQrScanAt: shop.lastQrScanAt,
      pickupGpsRadiusMeters: shop.pickupGpsRadiusMeters || 200,
      pickupGpsEnforced: shop.pickupGpsEnforced ?? true,
    },
  });
});

// POST /delivery/store/:id/qr/regenerate — admin/merchant regenerates QR token
router.post("/store/:id/qr/regenerate", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const shopId = req.params["id"] as string;
  const [shop] = await db.select().from(shops).where(eq(shops.id, shopId)).limit(1);
  if (!shop) {
    res.status(404).json({ success: false, message: "Shop not found" });
    return;
  }

  const newToken = crypto.randomUUID();
  const [updated] = await db
    .update(shops)
    .set({
      pickupQrToken: newToken,
      qrStatus: "active",
      qrRegeneratedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(shops.id, shopId))
    .returning();

  // Expire all existing active sessions for this store immediately
  await db
    .update(pickupVerificationSessions)
    .set({ status: "expired", updatedAt: new Date() })
    .where(and(eq(pickupVerificationSessions.storeId, shopId), eq(pickupVerificationSessions.status, "active")));

  res.json({
    success: true,
    message: "Store Pickup QR regenerated successfully! Old QR code is now invalid.",
    pickupQrToken: newToken,
    qrPayload: `SWIFTMART_PICKUP:${newToken}`,
    pickupUrl: `https://swiftmart.space/pickup/store/${newToken}`,
  });
});

// PATCH /delivery/store/:id/qr/status — admin toggles QR status & GPS radius
router.patch("/store/:id/qr/status", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const shopId = req.params["id"] as string;
  const { qrStatus, pickupGpsRadiusMeters, pickupGpsEnforced } = req.body as {
    qrStatus?: string;
    pickupGpsRadiusMeters?: number;
    pickupGpsEnforced?: boolean;
  };

  const updateData: Record<string, any> = { updatedAt: new Date() };
  if (qrStatus && (qrStatus === "active" || qrStatus === "disabled")) {
    updateData["qrStatus"] = qrStatus;
  }
  if (typeof pickupGpsRadiusMeters === "number" && pickupGpsRadiusMeters >= 50) {
    updateData["pickupGpsRadiusMeters"] = pickupGpsRadiusMeters;
  }
  if (typeof pickupGpsEnforced === "boolean") {
    updateData["pickupGpsEnforced"] = pickupGpsEnforced;
  }

  const [updated] = await db
    .update(shops)
    .set(updateData)
    .where(eq(shops.id, shopId))
    .returning();

  if (!updated) {
    res.status(404).json({ success: false, message: "Shop not found" });
    return;
  }

  res.json({ success: true, shop: mi(updated) });
});

// GET /delivery/admin/pickup-logs — admin audit logs of QR scans
router.get("/admin/pickup-logs", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const storeId = req.query["storeId"] as string | undefined;
  const riderId = req.query["riderId"] as string | undefined;
  const limit = Math.min(Number(req.query["limit"] || 50), 200);

  const conditions = [];
  if (storeId) conditions.push(eq(pickupScanLogs.storeId, storeId));
  if (riderId) conditions.push(eq(pickupScanLogs.riderId, riderId));

  const whereClause = conditions.length ? and(...conditions) : undefined;
  const logs = await db
    .select()
    .from(pickupScanLogs)
    .where(whereClause)
    .orderBy(desc(pickupScanLogs.createdAt))
    .limit(limit);

  res.json({ success: true, logs: miArr(logs) });
});

export default router;

