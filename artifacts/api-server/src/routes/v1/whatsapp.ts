import { Router, type Response } from "express";
import { whatsappService } from "../../services/whatsapp.js";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { db, orders, users, shops } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../../lib/logger.js";

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

// 5. 1-Click Order Action for Vendors from WhatsApp link
router.get("/order-action", async (req, res: Response): Promise<void> => {
  const { orderId, action } = req.query as { orderId?: string; action?: string };

  if (!orderId || !action) {
    res.status(400).send("<h3>Invalid order action request.</h3>");
    return;
  }

  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) {
      res.status(404).send("<h3>Order not found.</h3>");
      return;
    }

    if (action === "accept") {
      if (order.status !== "placed" && order.status !== "pending") {
        res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Order Already Processed</title>
              <style>
                body { font-family: system-ui, sans-serif; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center; }
                .card { background: #1e293b; padding: 32px; border-radius: 24px; border: 1px solid #334155; max-width: 400px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
                h2 { color: #f59e0b; margin-top: 0; }
                p { color: #94a3b8; font-size: 14px; line-height: 1.5; }
                .btn { display: inline-block; margin-top: 20px; background: #10b981; color: #fff; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 12px; }
              </style>
            </head>
            <body>
              <div class="card">
                <h2>ℹ️ Order Already Updated</h2>
                <p>Order <strong>#${order.id.slice(-6).toUpperCase()}</strong> is currently in status: <strong>${order.status.toUpperCase()}</strong>.</p>
                <a href="https://swiftmart.space/vendor/orders" class="btn">Open Vendor Dashboard</a>
              </div>
            </body>
          </html>
        `);
        return;
      }

      await db.update(orders).set({ status: "confirmed", updatedAt: new Date() }).where(eq(orders.id, orderId));

      // Instant WhatsApp notification to Customer on order accept
      if (order.customerPhone) {
        const isEcommerce = whatsappService.isEcommerceOrder({
          deliveryType: order.deliveryType,
          items: order.items,
        });
        whatsappService.sendOrderAcceptedToCustomer({
          customerPhone: order.customerPhone,
          customerName: order.customerName,
          shopName: order.shopName,
          orderNumber: order.id.slice(-6).toUpperCase(),
          orderId: order.id,
          isEcommerce,
          netAmount: order.netAmount,
          items: (order.items as any[]) || [],
        }).catch((err) => {
          logger.warn({ err }, "[WhatsApp] Background customer alert error on accept");
        });
      }

      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Order Accepted</title>
            <style>
              body { font-family: system-ui, sans-serif; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center; }
              .card { background: #1e293b; padding: 32px; border-radius: 24px; border: 1px solid #10b981; max-width: 400px; width: 100%; box-shadow: 0 20px 25px -5px rgba(16,185,129,0.2); }
              .icon { font-size: 48px; margin-bottom: 12px; }
              h2 { color: #10b981; margin: 0 0 8px 0; }
              p { color: #94a3b8; font-size: 14px; line-height: 1.5; }
              .btn { display: inline-block; margin-top: 20px; background: #10b981; color: #0f172a; font-weight: 800; text-decoration: none; padding: 12px 24px; border-radius: 12px; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="icon">✅</div>
              <h2>Order Accepted!</h2>
              <p>Order <strong>#${order.id.slice(-6).toUpperCase()}</strong> has been accepted successfully.<br>Please prepare the items for delivery pickup.</p>
              <a href="https://swiftmart.space/vendor/orders" class="btn">View on Dashboard</a>
            </div>
          </body>
        </html>
      `);
    } else if (action === "reject") {
      await db.update(orders).set({ status: "cancelled", updatedAt: new Date() }).where(eq(orders.id, orderId));

      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Order Rejected</title>
            <style>
              body { font-family: system-ui, sans-serif; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center; }
              .card { background: #1e293b; padding: 32px; border-radius: 24px; border: 1px solid #ef4444; max-width: 400px; width: 100%; box-shadow: 0 20px 25px -5px rgba(239,68,68,0.2); }
              .icon { font-size: 48px; margin-bottom: 12px; }
              h2 { color: #ef4444; margin: 0 0 8px 0; }
              p { color: #94a3b8; font-size: 14px; line-height: 1.5; }
              .btn { display: inline-block; margin-top: 20px; background: #334155; color: #fff; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 12px; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="icon">❌</div>
              <h2>Order Rejected</h2>
              <p>Order <strong>#${order.id.slice(-6).toUpperCase()}</strong> has been marked as rejected/cancelled.</p>
              <a href="https://swiftmart.space/vendor/orders" class="btn">Return to Dashboard</a>
            </div>
          </body>
        </html>
      `);
    } else {
      res.status(400).send("<h3>Unknown action.</h3>");
    }
  } catch (err: unknown) {
    logger.error({ err }, "[WhatsApp Action] Failed to process order action");
    res.status(500).send("<h3>Internal server error processing request.</h3>");
  }
});

export default router;
