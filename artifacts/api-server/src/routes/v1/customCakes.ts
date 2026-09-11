import { Router, type Response } from "express";
import { db, customCakeRequests, orders, shops, users, deliverySettings } from "@workspace/db";
import { eq, desc, and, or, sql, ilike } from "drizzle-orm";
import { authenticate, optionalAuth, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { mi, miArr } from "../../utils/mapId.js";
import { createNotificationLimited } from "../../utils/notification.js";
import { logger } from "../../lib/logger.js";

const router = Router();

// Helper to fetch current custom cake delivery fee setting (default 40)
async function getCustomCakeDeliveryFee(): Promise<number> {
  try {
    const [row] = await db.select().from(deliverySettings).where(eq(deliverySettings.key, "custom_cake_delivery_fee")).limit(1);
    if (row && !isNaN(Number(row.value))) {
      return Number(row.value);
    }
  } catch (_) {}
  return 40;
}

// ─── 1. Public Config ─────────────────────────────────────────────────────────
// GET /api/custom-cakes/config
router.get("/config", async (_req, res: Response): Promise<void> => {
  const fee = await getCustomCakeDeliveryFee();
  res.json({
    success: true,
    customCakeDeliveryFee: fee,
    selfPickupFee: 0,
    unit: "pound",
    weights: [
      { label: "1 Pound (1 lb)", value: 1.0, popular: true, approxGrams: 450 },
      { label: "1.5 Pounds (1.5 lbs)", value: 1.5, approxGrams: 680 },
      { label: "2 Pounds (2 lbs)", value: 2.0, popular: true, approxGrams: 900 },
      { label: "2.5 Pounds (2.5 lbs)", value: 2.5, approxGrams: 1130 },
      { label: "3 Pounds (3 lbs)", value: 3.0, approxGrams: 1350 },
      { label: "4 Pounds (4 lbs)", value: 4.0, approxGrams: 1800 },
      { label: "5 Pounds (5 lbs)", value: 5.0, approxGrams: 2250 },
      { label: "6+ Pounds (Custom)", value: 6.0, approxGrams: 2700 },
    ],
    flavours: [
      "Chocolate Truffle",
      "Black Forest",
      "Red Velvet",
      "Butterscotch",
      "Vanilla",
      "Pineapple",
      "Strawberry",
      "Mango",
      "Blueberry",
      "Fruit & Nut",
      "Rasmalai",
      "Choco Vanilla Fusion",
      "Custom / Other",
    ],
    occasions: [
      "Birthday",
      "Anniversary",
      "Wedding / Reception",
      "Baby Shower",
      "Celebration",
      "Festival",
      "Farewell / Congrats",
      "Other",
    ],
    tiers: [1, 2, 3, 4],
    leadTimeNotice: "Please order at least 4-6 hours in advance for fresh preparation.",
  });
});

// Helper to format custom cake object with pound weight
function formatCustomCake(req: any) {
  const mapped = mi(req);
  const resolvedLbs = Number(req.weightLbs) || (Number(req.weightKg) ? Math.round(Number(req.weightKg) * 2.20462 * 10) / 10 : 1);
  return {
    ...mapped,
    weightLbs: resolvedLbs,
    weightFormatted: `${resolvedLbs} ${resolvedLbs === 1 ? 'Pound (1 lb)' : 'lbs'}`,
  };
}

// ─── 2. Customer: Submit Custom Cake Request ─────────────────────────────────
// POST /api/custom-cakes/request
router.post("/request", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const {
      shopId,
      occasion = "Birthday",
      flavour = "Chocolate",
      weightLbs = 1,
      weightKg,
      tierCount = 1,
      eggless = false,
      messageOnCake = "",
      description = "",
      referenceImageUrl,
      requiredDate,
      requiredTime,
      fulfillmentType = "delivery",
      deliveryAddress,
      customerName,
      customerPhone,
    } = req.body;

    if (!shopId || !requiredDate || !requiredTime) {
      res.status(400).json({ success: false, message: "shopId, requiredDate, and requiredTime are required." });
      return;
    }

    // Get shop details
    const [shop] = await db.select().from(shops).where(eq(shops.id, shopId)).limit(1);
    if (!shop) {
      res.status(404).json({ success: false, message: "Shop not found" });
      return;
    }

    // Get user details
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const resolvedName = customerName || user?.name || "Customer";
    const resolvedPhone = customerPhone || user?.phone || "";

    const parsedWeightLbs = Number(weightLbs) || (Number(weightKg) ? Number(weightKg) * 2.20462 : 1);
    const parsedWeightKg = parsedWeightLbs * 0.453592;

    const [created] = await db.insert(customCakeRequests).values({
      shopId,
      shopName: shop.shopName,
      customerId: userId,
      customerName: resolvedName,
      customerPhone: resolvedPhone,
      occasion,
      flavour,
      weightLbs: parsedWeightLbs,
      weightKg: parsedWeightKg,
      tierCount: Number(tierCount) || 1,
      eggless: Boolean(eggless),
      messageOnCake: messageOnCake || "",
      description: description || "",
      referenceImageUrl: referenceImageUrl || null,
      requiredDate,
      requiredTime,
      fulfillmentType: fulfillmentType === "self_pickup" ? "self_pickup" : "delivery",
      deliveryAddress: deliveryAddress || {},
      status: "requested",
    }).returning();

    // Send notification to shop owner
    try {
      await createNotificationLimited(shop.ownerId, {
        type: "order_update",
        title: "🎂 New Custom Cake Request!",
        message: `${resolvedName} requested a ${parsedWeightLbs} lb ${flavour} cake for ${requiredDate} (${fulfillmentType === "self_pickup" ? "Self Pickup" : "Delivery"}). Provide a price quote now!`,
      });
    } catch (_) {}

    res.status(201).json({
      success: true,
      request: formatCustomCake(created!),
      message: "Custom cake request submitted successfully. The baker will provide a price quote shortly.",
    });
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "POST /api/custom-cakes/request error");
    res.status(500).json({ success: false, message: err?.message || "Internal server error" });
  }
});

// ─── 3. Customer: View My Cake Requests ──────────────────────────────────────
// GET /api/custom-cakes/my-requests
router.get("/my-requests", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const requests = await db
      .select()
      .from(customCakeRequests)
      .where(eq(customCakeRequests.customerId, userId!))
      .orderBy(desc(customCakeRequests.createdAt));

    res.json({
      success: true,
      requests: requests.map(formatCustomCake),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || "Internal server error" });
  }
});

// ─── 4. Vendor: View Shop Cake Requests ──────────────────────────────────────
// GET /api/custom-cakes/shop-requests
router.get("/shop-requests", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { shopId, status } = req.query as Record<string, string>;

    let targetShopId = shopId;
    if (!targetShopId) {
      const [ownedShop] = await db.select().from(shops).where(eq(shops.ownerId, userId!)).limit(1);
      if (!ownedShop) {
        res.status(404).json({ success: false, message: "No shop associated with user" });
        return;
      }
      targetShopId = ownedShop.id;
    }

    const conditions = [eq(customCakeRequests.shopId, targetShopId)];
    if (status && status !== "all") {
      conditions.push(eq(customCakeRequests.status, status));
    }

    const requests = await db
      .select()
      .from(customCakeRequests)
      .where(and(...conditions))
      .orderBy(desc(customCakeRequests.createdAt));

    res.json({
      success: true,
      requests: requests.map(formatCustomCake),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || "Internal server error" });
  }
});

// ─── 4b. Admin: View All Cake Requests Across All Shops ─────────────────────
// GET /api/custom-cakes/admin/all
router.get("/admin/all", authenticate, requireRole("admin", "super_admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, shopId, search } = req.query as Record<string, string>;

    const conditions = [];
    if (status && status !== "all") {
      conditions.push(eq(customCakeRequests.status, status));
    }
    if (shopId && shopId !== "all") {
      conditions.push(eq(customCakeRequests.shopId, shopId));
    }
    if (search) {
      conditions.push(
        or(
          ilike(customCakeRequests.customerName, `%${search}%`),
          ilike(customCakeRequests.customerPhone, `%${search}%`),
          ilike(customCakeRequests.shopName, `%${search}%`),
          ilike(customCakeRequests.flavour, `%${search}%`),
          ilike(customCakeRequests.occasion, `%${search}%`)
        )!
      );
    }

    const where = conditions.length ? and(...conditions) : undefined;
    const requests = await db
      .select()
      .from(customCakeRequests)
      .where(where)
      .orderBy(desc(customCakeRequests.createdAt));

    // Stats summary
    const allRequests = await db.select().from(customCakeRequests);
    const stats = {
      total: allRequests.length,
      requested: allRequests.filter(r => r.status === "requested").length,
      quoteSent: allRequests.filter(r => r.status === "quote_sent").length,
      confirmed: allRequests.filter(r => r.status === "confirmed").length,
      preparing: allRequests.filter(r => r.status === "preparing").length,
      ready: allRequests.filter(r => r.status === "ready").length,
      completed: allRequests.filter(r => r.status === "delivered" || r.status === "customer_picked_up").length,
      cancelled: allRequests.filter(r => r.status === "cancelled" || r.status === "rejected").length,
    };

    res.json({
      success: true,
      requests: requests.map(formatCustomCake),
      stats,
    });
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "GET /api/custom-cakes/admin/all error");
    res.status(500).json({ success: false, message: err?.message || "Internal server error" });
  }
});

// ─── 5. View Single Cake Request Detail ──────────────────────────────────────
// GET /api/custom-cakes/:id
router.get("/:id", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params["id"] as string;
    const [request] = await db.select().from(customCakeRequests).where(eq(customCakeRequests.id, id)).limit(1);
    if (!request) {
      res.status(404).json({ success: false, message: "Custom cake request not found" });
      return;
    }

    res.json({
      success: true,
      request: formatCustomCake(request),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || "Internal server error" });
  }
});

// ─── 6. Seller / Owner: Send Price Quote ─────────────────────────────────────
// POST /api/custom-cakes/:id/quote
router.post("/:id/quote", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params["id"] as string;
    const userId = req.user?.userId;
    const { cakePrice, advanceRequired, preparationTimeHours = 4, quoteNotes = "" } = req.body;

    const [cakeReq] = await db.select().from(customCakeRequests).where(eq(customCakeRequests.id, id)).limit(1);
    if (!cakeReq) {
      res.status(404).json({ success: false, message: "Request not found" });
      return;
    }

    // Check seller ownership / admin role
    const [shop] = await db.select().from(shops).where(eq(shops.id, cakeReq.shopId)).limit(1);
    const isOwner = shop && shop.ownerId === userId;
    const isAdmin = req.user?.role === "admin" || req.user?.role === "super_admin";

    if (!isOwner && !isAdmin) {
      res.status(403).json({ success: false, message: "Only the shop owner or admin can provide price quotes." });
      return;
    }

    const parsedCakePrice = Number(cakePrice);
    const parsedAdvance = Number(advanceRequired);
    const parsedPrepTime = Number(preparationTimeHours);

    if (isNaN(parsedCakePrice) || parsedCakePrice <= 0) {
      res.status(400).json({ success: false, message: "Invalid cake price" });
      return;
    }

    if (isNaN(parsedAdvance) || parsedAdvance < 0 || parsedAdvance > parsedCakePrice) {
      res.status(400).json({ success: false, message: "Advance required must be between ₹0 and the total cake price." });
      return;
    }

    // Determine delivery fee based on fulfillment type
    let deliveryFee = 0;
    if (cakeReq.fulfillmentType === "delivery") {
      deliveryFee = await getCustomCakeDeliveryFee();
    }

    const totalAmount = parsedCakePrice + deliveryFee;
    const remainingAmount = totalAmount - parsedAdvance;

    const [updated] = await db
      .update(customCakeRequests)
      .set({
        status: "quote_sent",
        cakePrice: parsedCakePrice,
        advanceRequired: parsedAdvance,
        preparationTimeHours: parsedPrepTime,
        deliveryFee,
        totalAmount,
        remainingAmount,
        quoteNotes: quoteNotes || "",
        quotedAt: new Date(),
        quotedByUserId: userId,
        updatedAt: new Date(),
      })
      .where(eq(customCakeRequests.id, id))
      .returning();

    // Send notification to customer
    try {
      await createNotificationLimited(cakeReq.customerId, {
        type: "order_update",
        title: `🎂 Quote Received: ${cakeReq.shopName}`,
        message: `${cakeReq.shopName} quoted ₹${parsedCakePrice} for your custom cake (Advance required: ₹${parsedAdvance}). Review and pay advance to confirm your order!`,
      });
    } catch (_) {}

    res.json({
      success: true,
      request: formatCustomCake(updated!),
      message: "Price quote sent to customer successfully.",
    });
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "POST /api/custom-cakes/:id/quote error");
    res.status(500).json({ success: false, message: err?.message || "Internal server error" });
  }
});

// ─── 7. Customer: Accept Quote & Pay Advance ─────────────────────────────────
// POST /api/custom-cakes/:id/accept-and-pay
router.post("/:id/accept-and-pay", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params["id"] as string;
    const userId = req.user?.userId;

    const [cakeReq] = await db.select().from(customCakeRequests).where(eq(customCakeRequests.id, id)).limit(1);
    if (!cakeReq) {
      res.status(404).json({ success: false, message: "Request not found" });
      return;
    }

    if (cakeReq.customerId !== userId) {
      res.status(403).json({ success: false, message: "Unauthorized to pay for this request" });
      return;
    }

    if (cakeReq.status !== "quote_sent") {
      res.status(400).json({ success: false, message: `Cannot pay advance in '${cakeReq.status}' status.` });
      return;
    }

    const advanceToPay = cakeReq.advanceRequired || 0;
    const remaining = (cakeReq.totalAmount || 0) - advanceToPay;

    // Generate 6-digit one-time pickup PIN for self-pickup
    let pickupCode: string | null = null;
    let pickupQrCode: string | null = null;
    if (cakeReq.fulfillmentType === "self_pickup") {
      pickupCode = String(Math.floor(100000 + Math.random() * 900000));
      pickupQrCode = crypto.randomUUID();
    }

    const resolvedLbs = cakeReq.weightLbs || (cakeReq.weightKg ? Math.round(cakeReq.weightKg * 2.20462 * 10) / 10 : 1);

    // Create linked official order in orders table
    const [newOrder] = await db.insert(orders).values({
      id: crypto.randomUUID(),
      customerId: userId!,
      customerName: cakeReq.customerName,
      customerPhone: cakeReq.customerPhone,
      shopId: cakeReq.shopId,
      shopName: cakeReq.shopName,
      items: [
        {
          id: `custom_cake_${cakeReq.id}`,
          name: `Custom Cake: ${cakeReq.flavour} (${resolvedLbs} lbs / Pounds)`,
          price: cakeReq.cakePrice || 0,
          quantity: 1,
          image: cakeReq.referenceImageUrl || "",
          occasion: cakeReq.occasion,
          messageOnCake: cakeReq.messageOnCake,
          fulfillmentType: cakeReq.fulfillmentType,
          customCakeRequestId: cakeReq.id,
        },
      ],
      subtotal: cakeReq.cakePrice || 0,
      deliveryCharge: cakeReq.deliveryFee || 0,
      netAmount: cakeReq.totalAmount || 0,
      status: "confirmed",
      paymentMethod: advanceToPay > 0 ? "Advance Online + Balance on Delivery" : "COD",
      paymentStatus: advanceToPay >= (cakeReq.totalAmount || 0) ? "paid" : "partially_paid",
      deliveryType: cakeReq.fulfillmentType === "delivery" ? "custom_cake" : "self_pickup",
      address: cakeReq.deliveryAddress || {},
    }).returning();

    const [updated] = await db
      .update(customCakeRequests)
      .set({
        status: "confirmed",
        advancePaid: advanceToPay,
        advancePaidAt: new Date(),
        remainingAmount: remaining,
        orderId: newOrder?.id,
        pickupCode: pickupCode || undefined,
        pickupQrCode: pickupQrCode || undefined,
        updatedAt: new Date(),
      })
      .where(eq(customCakeRequests.id, id))
      .returning();

    // Notify shop owner
    const [shop] = await db.select().from(shops).where(eq(shops.id, cakeReq.shopId)).limit(1);
    if (shop) {
      try {
        await createNotificationLimited(shop.ownerId, {
          type: "order_update",
          title: "🎉 Advance Paid! Custom Cake Order Confirmed",
          message: `${cakeReq.customerName} paid ₹${advanceToPay} advance for ${cakeReq.flavour} Cake (${resolvedLbs} lbs). Start preparing for ${cakeReq.requiredDate}!`,
        });
      } catch (_) {}
    }

    res.json({
      success: true,
      request: formatCustomCake(updated!),
      order: mi(newOrder!),
      message: `Advance payment of ₹${advanceToPay} successful! Your custom cake order is confirmed.`,
    });
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "POST /api/custom-cakes/:id/accept-and-pay error");
    res.status(500).json({ success: false, message: err?.message || "Internal server error" });
  }
});

// ─── 8. Seller / Staff: Update Status (preparing / ready) ───────────────────
// PATCH /api/custom-cakes/:id/status
router.patch("/:id/status", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params["id"] as string;
    const userId = req.user?.userId;
    const { status, cancelReason } = req.body;

    const [cakeReq] = await db.select().from(customCakeRequests).where(eq(customCakeRequests.id, id)).limit(1);
    if (!cakeReq) {
      res.status(404).json({ success: false, message: "Request not found" });
      return;
    }

    // Check seller ownership or admin
    const [shop] = await db.select().from(shops).where(eq(shops.id, cakeReq.shopId)).limit(1);
    const isOwner = shop && shop.ownerId === userId;
    const isAdmin = req.user?.role === "admin" || req.user?.role === "super_admin";

    if (!isOwner && !isAdmin) {
      res.status(403).json({ success: false, message: "Unauthorized to update this cake order status." });
      return;
    }

    const validStatuses = ["preparing", "ready", "rejected", "cancelled"];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: `Invalid status '${status}'` });
      return;
    }

    const [updated] = await db
      .update(customCakeRequests)
      .set({
        status,
        cancelReason: cancelReason || undefined,
        updatedAt: new Date(),
      })
      .where(eq(customCakeRequests.id, id))
      .returning();

    // If linked order exists, update order status accordingly
    if (cakeReq.orderId) {
      const orderStatusMap: Record<string, string> = {
        preparing: "preparing",
        ready: "ready",
        rejected: "cancelled",
        cancelled: "cancelled",
      };
      if (orderStatusMap[status]) {
        await db.update(orders).set({ status: orderStatusMap[status], updatedAt: new Date() }).where(eq(orders.id, cakeReq.orderId));
      }
    }

    // Customer Notification
    if (status === "preparing") {
      try {
        await createNotificationLimited(cakeReq.customerId, {
          type: "order_update",
          title: "👨‍🍳 Your Cake is in the Oven!",
          message: `${cakeReq.shopName} has started preparing and baking your custom cake.`,
        });
      } catch (_) {}
    } else if (status === "ready") {
      if (cakeReq.fulfillmentType === "self_pickup") {
        try {
          await createNotificationLimited(cakeReq.customerId, {
            type: "order_update",
            title: "🎂 Your Cake is Ready for Pickup!",
            message: `Your custom cake is ready at ${cakeReq.shopName}! Show your Pickup Code (${cakeReq.pickupCode}) at the store counter.`,
          });
        } catch (_) {}
      } else {
        try {
          await createNotificationLimited(cakeReq.customerId, {
            type: "order_update",
            title: "🎂 Cake is Ready — Assigning Delivery Partner",
            message: `Your custom cake is ready and packed at ${cakeReq.shopName}. A delivery partner will pick it up shortly.`,
          });
        } catch (_) {}
      }
    }

    res.json({
      success: true,
      request: formatCustomCake(updated!),
      message: `Status updated to '${status}'.`,
    });
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "PATCH /api/custom-cakes/:id/status error");
    res.status(500).json({ success: false, message: err?.message || "Internal server error" });
  }
});

// ─── 9. Seller / Staff: Verify Customer Self-Pickup ──────────────────────────
// POST /api/custom-cakes/:id/verify-pickup
router.post("/:id/verify-pickup", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params["id"] as string;
    const userId = req.user?.userId;
    const { pickupCode, pickupQrCode } = req.body;

    const [cakeReq] = await db.select().from(customCakeRequests).where(eq(customCakeRequests.id, id)).limit(1);
    if (!cakeReq) {
      res.status(404).json({ success: false, message: "Cake order not found" });
      return;
    }

    if (cakeReq.fulfillmentType !== "self_pickup") {
      res.status(400).json({ success: false, message: "This order is marked for delivery, not self pickup." });
      return;
    }

    if (cakeReq.status === "customer_picked_up" || cakeReq.status === "delivered") {
      res.status(400).json({ success: false, message: "This order has already been picked up." });
      return;
    }

    // Verify 6-digit PIN or QR Code
    let codeMatches = false;
    if (pickupCode && cakeReq.pickupCode && String(pickupCode).trim() === String(cakeReq.pickupCode).trim()) {
      codeMatches = true;
    }
    if (pickupQrCode && cakeReq.pickupQrCode && String(pickupQrCode).trim() === String(cakeReq.pickupQrCode).trim()) {
      codeMatches = true;
    }

    if (!codeMatches) {
      res.status(400).json({
        success: false,
        message: "Invalid Pickup Code / QR Code. Please check the customer's app screen.",
      });
      return;
    }

    // Mark as customer picked up
    const [updated] = await db
      .update(customCakeRequests)
      .set({
        status: "customer_picked_up",
        pickedUpAt: new Date(),
        verifiedByUserId: userId,
        updatedAt: new Date(),
      })
      .where(eq(customCakeRequests.id, id))
      .returning();

    // If linked order exists, mark as delivered/completed
    if (cakeReq.orderId) {
      await db.update(orders).set({ status: "delivered", updatedAt: new Date() }).where(eq(orders.id, cakeReq.orderId));
    }

    // Notify customer
    try {
      await createNotificationLimited(cakeReq.customerId, {
        type: "order_update",
        title: "🎉 Cake Pickup Confirmed!",
        message: `Your pickup at ${cakeReq.shopName} was verified successfully. Enjoy your cake!`,
      });
    } catch (_) {}

    res.json({
      success: true,
      request: formatCustomCake(updated!),
      message: "Customer pickup verified successfully. Order completed!",
    });
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "POST /api/custom-cakes/:id/verify-pickup error");
    res.status(500).json({ success: false, message: err?.message || "Internal server error" });
  }
});

export default router;
