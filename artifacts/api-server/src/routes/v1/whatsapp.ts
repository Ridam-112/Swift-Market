import { Router, type Response } from "express";
import { whatsappService, generateWhatsAppActionToken, verifyWhatsAppActionToken } from "../../services/whatsapp.js";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { db, orders, users, shops, deliveryPartners, products, payouts } from "@workspace/db";
import { eq, and, or, inArray, sql } from "drizzle-orm";
import { logger } from "../../lib/logger.js";
import { createNotificationLimited } from "../../utils/notification.js";
import { getMessagingInstance } from "../../lib/firebase-admin.js";

const router = Router();
const A = requireRole("admin", "super_admin");

// 1. Get WhatsApp Connection Status & QR Code (Admin only)
router.get("/status", authenticate, A, async (_req: AuthRequest, res: Response) => {
  const status = await whatsappService.getStatusAsync();
  res.json({
    success: true,
    data: status,
  });
});

// 1b. Keep-alive long poll while scanning QR code (Admin only)
router.get("/wait-for-connection", authenticate, A, async (_req: AuthRequest, res: Response) => {
  const status = await whatsappService.waitForConnection(20000);
  res.json({
    success: true,
    data: status,
  });
});

// 2. Trigger connection / generate QR (Admin only)
router.post("/connect", authenticate, A, async (_req: AuthRequest, res: Response) => {
  try {
    await whatsappService.init();
    // Wait up to 8.5s for Baileys to connect & emit QR code Data URL
    const status = await whatsappService.waitForQrOrStatus(8500);
    res.json({
      success: true,
      message: status.qr
        ? "WhatsApp QR code ready! Please scan using your WhatsApp mobile app."
        : "WhatsApp connection initialized. Checking status...",
      data: status,
    });
  } catch (err: unknown) {
    logger.error({ err }, "[WhatsApp] Connection initialization error");
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to initialize WhatsApp",
    });
  }
});

// 3. Disconnect / Logout (Admin only)
router.post("/disconnect", authenticate, A, async (_req: AuthRequest, res: Response) => {
  try {
    await whatsappService.logout();
    const status = await whatsappService.getStatusAsync();
    res.json({
      success: true,
      message: "WhatsApp disconnected successfully.",
      data: status,
    });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Failed to disconnect WhatsApp",
    });
  }
});

// 4. Send Test Message (Admin only)
router.post("/test", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const { phone, message } = req.body as { phone?: string; message?: string };
  if (!phone) {
    res.status(400).json({ success: false, message: "Phone number is required." });
    return;
  }

  const text = message || "👋 Hello from SwiftMart WhatsApp Automation! Connection is verified and working perfectly.";
  const sent = await whatsappService.sendMessage(phone, text);

  if (sent) {
    res.json({ success: true, message: `Test message sent to ${phone}` });
  } else {
    res.status(500).json({
      success: false,
      message: "Failed to send message. Please make sure WhatsApp is connected in Admin Panel.",
    });
  }
});

function renderActionHtml(params: {
  icon: string;
  title: string;
  badge: string;
  badgeColor: string;
  orderNumber: string;
  shopName: string;
  stepNotice?: string;
  description: string;
  primaryBtnText: string;
  primaryBtnUrl: string;
  primaryBtnStyle?: "default" | "call-rider";
  secondaryBtnText?: string;
  secondaryBtnUrl?: string;
}): string {
  const isCallRider = params.primaryBtnStyle === "call-rider";
  const btnBg = isCallRider
    ? "background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #fff; box-shadow: 0 10px 25px -5px rgba(249, 115, 22, 0.4);"
    : "background: #10b981; color: #0f172a;";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${params.title} — SwiftMart</title>
    <style>
      * { box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background: #090d16;
        color: #f8fafc;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        margin: 0;
        padding: 20px;
      }
      .card {
        background: #131c2e;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 28px;
        padding: 36px 28px;
        max-width: 440px;
        width: 100%;
        text-align: center;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
        position: relative;
        overflow: hidden;
      }
      .card::before {
        content: "";
        position: absolute;
        top: 0; left: 0; right: 0; height: 4px;
        background: ${params.badgeColor};
      }
      .icon-circle {
        width: 80px;
        height: 80px;
        margin: 0 auto 20px auto;
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 42px;
      }
      .badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 9999px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        background: ${params.badgeColor}22;
        color: ${params.badgeColor};
        border: 1px solid ${params.badgeColor}44;
        margin-bottom: 12px;
      }
      h1 {
        font-size: 24px;
        font-weight: 800;
        margin: 0 0 6px 0;
        letter-spacing: -0.02em;
      }
      .shop-info {
        font-size: 14px;
        color: #94a3b8;
        margin-bottom: 18px;
      }
      .shop-info strong {
        color: #f1f5f9;
      }
      ${params.stepNotice ? `
      .step-notice {
        background: rgba(249, 115, 22, 0.1);
        border: 1px dashed rgba(249, 115, 22, 0.3);
        border-radius: 12px;
        padding: 10px 14px;
        font-size: 12px;
        font-weight: 600;
        color: #fb923c;
        margin-bottom: 18px;
        line-height: 1.4;
      }
      ` : ""}
      .desc {
        font-size: 14px;
        line-height: 1.6;
        color: #94a3b8;
        margin: 0 0 28px 0;
        text-align: left;
        background: rgba(255, 255, 255, 0.02);
        padding: 16px;
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.05);
      }
      .desc strong {
        color: #f8fafc;
      }
      .btn {
        display: block;
        width: 100%;
        padding: 15px 20px;
        border-radius: 16px;
        font-size: 15px;
        font-weight: 800;
        text-decoration: none;
        transition: transform 0.15s ease, opacity 0.15s ease;
        margin-bottom: 10px;
        text-align: center;
      }
      .btn:active {
        transform: scale(0.98);
      }
      .btn-primary {
        ${btnBg}
      }
      .btn-secondary {
        background: #1e293b;
        color: #cbd5e1;
        border: 1px solid #334155;
      }
      .footer {
        margin-top: 24px;
        font-size: 11px;
        color: #64748b;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="icon-circle">${params.icon}</div>
      <div class="badge">${params.badge}</div>
      <h1>${params.title}</h1>
      <div class="shop-info">Order <strong>#${params.orderNumber}</strong> · <strong>${params.shopName}</strong></div>
      ${params.stepNotice ? `<div class="step-notice">${params.stepNotice}</div>` : ""}
      <div class="desc">${params.description}</div>
      <a href="${params.primaryBtnUrl}" class="btn btn-primary">${params.primaryBtnText}</a>
      ${params.secondaryBtnText && params.secondaryBtnUrl ? `<a href="${params.secondaryBtnUrl}" class="btn btn-secondary">${params.secondaryBtnText}</a>` : ""}
      <div class="footer">SwiftMart Quick Commerce Logistics</div>
    </div>
  </body>
</html>`;
}

// 5. 1-Click Order Action for Vendors from WhatsApp link
router.get("/order-action", async (req, res: Response): Promise<void> => {
  const { orderId, action, token } = req.query as { orderId?: string; action?: string; token?: string };

  if (!orderId || !action) {
    res.status(400).send("<h3>Invalid order action request.</h3>");
    return;
  }

  // Cryptographic token verification to prevent unauthorized order cancellation or manipulation
  if (!verifyWhatsAppActionToken(orderId, action, token)) {
    logger.warn({ orderId, action }, "[WhatsApp] Action token signature verification failed or token missing");
    res.status(403).send("<h3>Security verification failed: Invalid or expired action link. Please manage this order through your SwiftMart Vendor Dashboard.</h3>");
    return;
  }

  const baseUrl = process.env.PUBLIC_APP_URL || "https://swiftmart.space";

  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) {
      res.status(404).send("<h3>Order not found.</h3>");
      return;
    }

    const shortId = order.id.slice(-6).toUpperCase();
    const readyToken = generateWhatsAppActionToken(order.id, "ready_call_rider");

    // ─── ACTION 1: ACCEPT (Transitions placed -> preparing) ──────────────────────
    if (action === "accept") {
      if (order.status === "cancelled" || order.status === "refunded") {
        res.send(renderActionHtml({
          icon: "⚠️",
          title: "Order Already Cancelled",
          badge: "CANCELLED",
          badgeColor: "#ef4444",
          orderNumber: shortId,
          shopName: order.shopName,
          description: `Order #${shortId} was previously cancelled or rejected and cannot be accepted.`,
          primaryBtnText: "Open Vendor Dashboard",
          primaryBtnUrl: `${baseUrl}/vendor/orders`,
        }));
        return;
      }

      if (order.status !== "placed" && order.status !== "pending") {
        const isPreparing = order.status === "preparing";
        res.send(renderActionHtml({
          icon: isPreparing ? "👨‍🍳" : "ℹ️",
          title: isPreparing ? "Order is Preparing" : "Order Already Processed",
          badge: order.status.toUpperCase(),
          badgeColor: isPreparing ? "#f97316" : "#10b981",
          orderNumber: shortId,
          shopName: order.shopName,
          description: isPreparing
            ? `Order #${shortId} is currently being prepared. Once items are packed and ready, summon a delivery rider below!`
            : `Order #${shortId} is currently in status: <strong>${order.status.toUpperCase()}</strong>.`,
          primaryBtnText: isPreparing ? "🛵 Order is Ready — Call Rider" : "Open Vendor Dashboard",
          primaryBtnUrl: isPreparing
            ? `${baseUrl}/api/v1/whatsapp/order-action?orderId=${order.id}&action=ready_call_rider&token=${readyToken}`
            : `${baseUrl}/vendor/orders`,
          secondaryBtnText: isPreparing ? "📊 Orders Dashboard" : undefined,
          secondaryBtnUrl: isPreparing ? `${baseUrl}/vendor/orders` : undefined,
        }));
        return;
      }

      // Transition order status to "preparing"
      await db.update(orders).set({ status: "preparing", updatedAt: new Date() }).where(eq(orders.id, orderId));

      // 1. Notify Customer in-app
      if (order.customerId) {
        createNotificationLimited(order.customerId, {
          type: "order_update",
          title: "Order Accepted & Preparing 👨‍🍳",
          message: `Your order #${shortId} from ${order.shopName} has been accepted and is now being prepared!`,
          data: { orderId: order.id, status: "preparing" },
        }).catch(() => {});
      }

      // 2. Instant WhatsApp notification to Customer
      if (order.customerPhone) {
        const isEcommerce = whatsappService.isEcommerceOrder({
          deliveryType: order.deliveryType,
          items: order.items,
        });
        whatsappService.sendOrderAcceptedToCustomer({
          customerPhone: order.customerPhone,
          customerName: order.customerName,
          shopName: order.shopName,
          orderNumber: shortId,
          orderId: order.id,
          isEcommerce,
          netAmount: order.netAmount,
          items: (order.items as any[]) || [],
        }).catch((err) => {
          logger.warn({ err }, "[WhatsApp] Background customer alert error on accept");
        });
      }

      // 3. Send WhatsApp follow-up message to Vendor with "🛵 Order is Ready — Call Rider" button
      const [shopRow] = await db.select({ ownerId: shops.ownerId, phone: shops.phone }).from(shops).where(eq(shops.id, order.shopId)).limit(1);
      let vendorPhone = shopRow?.phone;
      if (shopRow?.ownerId) {
        const [vendorUser] = await db.select({ phone: users.phone }).from(users).where(eq(users.id, shopRow.ownerId)).limit(1);
        if (vendorUser?.phone) vendorPhone = vendorUser.phone;
      }
      if (vendorPhone) {
        whatsappService.sendOrderPreparingToVendor({
          vendorPhone,
          shopName: order.shopName,
          orderNumber: shortId,
          orderId: order.id,
          itemCount: Array.isArray(order.items) ? order.items.length : 1,
          netAmount: order.netAmount,
        }).catch((err) => {
          logger.warn({ err }, "[WhatsApp] Background vendor alert error on accept");
        });
      }

      // 4. Render sleek web confirmation page for Vendor
      res.send(renderActionHtml({
        icon: "👨‍🍳",
        title: "Order Accepted — Preparing!",
        badge: "STATUS: PREPARING",
        badgeColor: "#f97316",
        orderNumber: shortId,
        shopName: order.shopName,
        stepNotice: "STEP 1 OF 2 COMPLETED: Kitchen / Counter is preparing items",
        description: `Order #${shortId} is now marked <strong>PREPARING</strong>.<br><br>Please prepare and pack the items carefully. When everything is packed and ready to go, tap the button below to summon a delivery partner to your store.`,
        primaryBtnText: "🛵 Order is Ready — Call Rider",
        primaryBtnUrl: `${baseUrl}/api/v1/whatsapp/order-action?orderId=${order.id}&action=ready_call_rider&token=${readyToken}`,
        primaryBtnStyle: "call-rider",
        secondaryBtnText: "📊 View on Dashboard",
        secondaryBtnUrl: `${baseUrl}/vendor/orders`,
      }));
      return;
    }

    // ─── ACTION 2: READY & CALL RIDER (Transitions preparing -> ready) ───────────
    if (action === "ready_call_rider") {
      if (order.status === "cancelled" || order.status === "refunded") {
        res.send(renderActionHtml({
          icon: "⚠️",
          title: "Order Cancelled",
          badge: "CANCELLED",
          badgeColor: "#ef4444",
          orderNumber: shortId,
          shopName: order.shopName,
          description: `Order #${shortId} was cancelled. Cannot call rider.`,
          primaryBtnText: "Return to Dashboard",
          primaryBtnUrl: `${baseUrl}/vendor/orders`,
        }));
        return;
      }

      if (order.status === "out_for_delivery" || order.status === "delivered") {
        res.send(renderActionHtml({
          icon: "🛵",
          title: "Order Already in Delivery",
          badge: order.status.toUpperCase(),
          badgeColor: "#8b5cf6",
          orderNumber: shortId,
          shopName: order.shopName,
          description: `Order #${shortId} has already been picked up and is ${order.status === "delivered" ? "delivered" : "out for delivery"}.`,
          primaryBtnText: "Open Vendor Dashboard",
          primaryBtnUrl: `${baseUrl}/vendor/orders`,
        }));
        return;
      }

      if (order.status === "ready" || order.status === "packed") {
        res.send(renderActionHtml({
          icon: "🛵",
          title: "Delivery Partner Summoned!",
          badge: "READY FOR PICKUP",
          badgeColor: "#10b981",
          orderNumber: shortId,
          shopName: order.shopName,
          stepNotice: "STEP 2 OF 2: Rider is heading to your store counter",
          description: `Delivery partners have already been summoned for Order #${shortId}.<br><br>📱 <strong>Counter QR Pickup:</strong> Keep the packed parcel ready. The rider will arrive shortly and scan your <strong>Store Pickup QR poster</strong> to verify and collect the order.`,
          primaryBtnText: "🏪 View Store Pickup QR",
          primaryBtnUrl: `${baseUrl}/vendor/settings`,
          secondaryBtnText: "📊 Open Orders Dashboard",
          secondaryBtnUrl: `${baseUrl}/vendor/orders`,
        }));
        return;
      }

      // Update order status in DB to "ready"
      await db.update(orders).set({ status: "ready", updatedAt: new Date() }).where(eq(orders.id, orderId));

      // 1. Notify Customer in-app
      if (order.customerId) {
        createNotificationLimited(order.customerId, {
          type: "order_update",
          title: "Order Packed & Ready! 🛵",
          message: `Order #${shortId} from ${order.shopName} is packed! A delivery partner is heading to the store for pickup.`,
          data: { orderId: order.id, status: "ready" },
        }).catch(() => {});
      }

      // 2. WhatsApp notification to Customer
      if (order.customerPhone) {
        whatsappService.sendOrderReadyToCustomer({
          customerPhone: order.customerPhone,
          customerName: order.customerName,
          shopName: order.shopName,
          orderNumber: shortId,
          orderId: order.id,
        }).catch((err) => {
          logger.warn({ err }, "[WhatsApp] Background customer alert error on ready");
        });
      }

      // 3. Dispatch / summon delivery partners (multicast FCM + in-app)
      const activePartners = await db
        .select({
          id: deliveryPartners.id,
          userId: deliveryPartners.userId,
          fcmToken: deliveryPartners.fcmToken,
          name: deliveryPartners.name,
          phone: deliveryPartners.phone,
        })
        .from(deliveryPartners)
        .where(and(eq(deliveryPartners.status, "active"), eq(deliveryPartners.isAvailable, true)));

      for (const partner of activePartners) {
        if (partner.userId) {
          createNotificationLimited(partner.userId, {
            type: "order_update",
            title: "⚡ NEW PICKUP READY!",
            message: `Order #${shortId} at ${order.shopName} is ready for pickup!`,
            data: { orderId: order.id, url: "/delivery/orders" },
          }).catch(() => {});
        }
      }

      const fcmTokensList = activePartners.map(p => p.fcmToken).filter(Boolean) as string[];
      if (fcmTokensList.length > 0) {
        try {
          const messaging = getMessagingInstance();
          if (messaging) {
            messaging.sendEachForMulticast({
              tokens: fcmTokensList,
              data: {
                type: "new_order",
                orderId: order.id,
                shopName: order.shopName,
                riderEarnings: "45.00",
                netAmount: String(order.netAmount),
                paymentMethod: String(order.paymentMethod || "COD"),
              },
              notification: {
                title: "⚡ NEW DELIVERY ORDER!",
                body: `₹45 • ${order.shopName} ➔ Deliver Now!`,
              },
              android: {
                priority: "high",
              },
            }).catch((err) => {
              logger.warn({ err }, "[FCM] Delivery partners broadcast warning");
            });
          }
        } catch (fcmErr) {
          logger.warn({ fcmErr }, "[FCM] Delivery partners broadcast error");
        }
      }

      // 4. Send Vendor confirmation on WhatsApp
      const [shopRow] = await db.select({ ownerId: shops.ownerId, phone: shops.phone }).from(shops).where(eq(shops.id, order.shopId)).limit(1);
      let vendorPhone = shopRow?.phone;
      if (shopRow?.ownerId) {
        const [vendorUser] = await db.select({ phone: users.phone }).from(users).where(eq(users.id, shopRow.ownerId)).limit(1);
        if (vendorUser?.phone) vendorPhone = vendorUser.phone;
      }
      if (vendorPhone) {
        whatsappService.sendRiderDispatchedToVendor({
          vendorPhone,
          shopName: order.shopName,
          orderNumber: shortId,
          orderId: order.id,
        }).catch((err) => {
          logger.warn({ err }, "[WhatsApp] Background vendor alert error on ready");
        });
      }

      // 5. Render confirmation page for Vendor
      res.send(renderActionHtml({
        icon: "🛵",
        title: "Delivery Partner Summoned!",
        badge: "READY FOR PICKUP",
        badgeColor: "#10b981",
        orderNumber: shortId,
        shopName: order.shopName,
        stepNotice: "STEP 2 OF 2: Rider summoned & en route to counter",
        description: `Order #${shortId} is marked <strong>READY FOR PICKUP</strong>.<br><br>A delivery partner has been summoned and will arrive at <strong>${order.shopName}</strong> shortly.<br><br>📱 <strong>Counter QR Verification:</strong> Keep items ready. The rider will scan your physical <strong>Store Pickup QR poster</strong> to verify the order items and collect the parcel.`,
        primaryBtnText: "🏪 View Store Pickup QR",
        primaryBtnUrl: `${baseUrl}/vendor/settings`,
        secondaryBtnText: "📊 Orders Dashboard",
        secondaryBtnUrl: `${baseUrl}/vendor/orders`,
      }));
      return;
    }

    // ─── ACTION 3: REJECT / CANCEL ────────────────────────────────────────────────
    if (action === "reject") {
      if (order.status === "cancelled" || order.status === "refunded") {
        res.send(renderActionHtml({
          icon: "⚠️",
          title: "Order Already Cancelled",
          badge: "CANCELLED",
          badgeColor: "#ef4444",
          orderNumber: shortId,
          shopName: order.shopName,
          description: `Order #${shortId} was already cancelled or rejected.`,
          primaryBtnText: "Open Vendor Dashboard",
          primaryBtnUrl: `${baseUrl}/vendor/orders`,
        }));
        return;
      }

      if (order.status === "out_for_delivery" || order.status === "delivered") {
        res.send(renderActionHtml({
          icon: "⚠️",
          title: "Order In Transit / Delivered",
          badge: order.status.toUpperCase(),
          badgeColor: "#8b5cf6",
          orderNumber: shortId,
          shopName: order.shopName,
          description: `Order #${shortId} cannot be rejected because it is already ${order.status === "delivered" ? "delivered" : "out for delivery"}.`,
          primaryBtnText: "Open Vendor Dashboard",
          primaryBtnUrl: `${baseUrl}/vendor/orders`,
        }));
        return;
      }

      await db.update(orders).set({
        status: "cancelled",
        cancelReason: "Rejected by shop owner via WhatsApp",
        updatedAt: new Date(),
      }).where(eq(orders.id, orderId));

      // Restore stock if items were reserved
      if (Array.isArray(order.items) && order.items.length) {
        for (const item of (order.items as any[])) {
          if (item.productId && item.qty) {
            await db.update(products)
              .set({ stock: sql`${products.stock} + ${item.qty}` })
              .where(eq(products.id, item.productId))
              .catch(() => {});
          }
        }
      }

      // Reverse financials
      await db.update(payouts)
        .set({ status: "cancelled" })
        .where(eq(payouts.orderId, orderId))
        .catch(() => {});

      // Notify customer
      if (order.customerId) {
        createNotificationLimited(order.customerId, {
          type: "order_cancelled",
          title: "Order Declined",
          message: `Your order #${shortId} could not be accepted by ${order.shopName} at this time.`,
          data: { orderId: order.id, status: "cancelled" },
        }).catch(() => {});
      }

      res.send(renderActionHtml({
        icon: "❌",
        title: "Order Rejected",
        badge: "REJECTED",
        badgeColor: "#ef4444",
        orderNumber: shortId,
        shopName: order.shopName,
        description: `Order #${shortId} has been marked as rejected / cancelled. Customer has been notified.`,
        primaryBtnText: "Return to Dashboard",
        primaryBtnUrl: `${baseUrl}/vendor/orders`,
      }));
      return;
    }

    res.status(400).send("<h3>Unknown order action.</h3>");
  } catch (err: unknown) {
    logger.error({ err }, "[WhatsApp Action] Failed to process order action");
    res.status(500).send("<h3>Internal server error processing request.</h3>");
  }
});

export default router;
