import { Router, type Request, type Response } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { db, orders, products, coupons } from "@workspace/db";
import { eq, inArray, and } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../../middlewares/auth.js";
import { mi } from "../../utils/mapId.js";
import { cancelOrderAndRestoreStock } from "../../utils/orderCleanup.js";

const router = Router();

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay credentials not configured");
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// POST /api/v1/payments/create-order
// Server computes amount from DB prices — prevents client-side amount tampering (C3)
router.post("/create-order", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { items, deliveryCharge = 0, couponCode, currency = "INR", receipt } = req.body as {
    items: Array<{ productId: string; qty: number }>;
    deliveryCharge?: number;
    couponCode?: string;
    currency?: string;
    receipt?: string;
  };

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ success: false, message: "items array is required" });
    return;
  }

  try {
    const keyId = process.env.RAZORPAY_KEY_ID!;

    // Fetch DB prices — never trust client-supplied prices
    const productIds = items.map(i => i.productId);
    const dbProducts = await db.select({ id: products.id, price: products.price })
      .from(products)
      .where(inArray(products.id, productIds));

    const priceMap = Object.fromEntries(dbProducts.map(p => [p.id, p.price]));

    for (const item of items) {
      if (priceMap[item.productId] == null) {
        res.status(400).json({ success: false, message: "One or more products are unavailable" });
        return;
      }
    }

    const subtotal = items.reduce((sum, item) => sum + priceMap[item.productId]! * item.qty, 0);

    // Validate coupon server-side if provided
    let couponDiscount = 0;
    if (couponCode) {
      const [coupon] = await db.select().from(coupons)
        .where(and(eq(coupons.code, couponCode.toUpperCase()), eq(coupons.isActive, true)))
        .limit(1);
      if (coupon && coupon.expiryDate >= new Date() && (coupon.usageLimit === 0 || coupon.usedCount < coupon.usageLimit)) {
        const orderTotal = subtotal + Number(deliveryCharge);
        if (orderTotal >= coupon.minimumOrder) {
          if (coupon.type === "percentage") {
            couponDiscount = Math.min((orderTotal * coupon.value) / 100, coupon.maximumDiscount ?? Infinity);
          } else if (coupon.type === "fixed") {
            couponDiscount = Math.min(coupon.value, orderTotal);
          }
        }
      }
    }

    const total = Math.max(+(subtotal + Number(deliveryCharge) - couponDiscount).toFixed(2), 1);

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: Math.round(total * 100),
      currency,
      receipt: receipt ?? `rcpt_${Date.now()}`,
    });
    res.json({ success: true, order, keyId, serverTotal: total, couponDiscount: +couponDiscount.toFixed(2) });
  } catch {
    res.status(502).json({ success: false, message: "Payment gateway error. Please try again." });
  }
});

// POST /api/v1/payments/verify
// Verifies Razorpay payment signature and marks our order as paid
router.post("/verify", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body as {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    orderId: string;
  };

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    res.status(500).json({ success: false, message: "Payment service not configured" });
    return;
  }

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expected !== razorpay_signature) {
    res.status(400).json({ success: false, message: "Invalid payment signature" });
    return;
  }

  try {
    const [order] = await db.update(orders)
      .set({
        paymentStatus: "success",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
      })
      .where(eq(orders.id, orderId))
      .returning();

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    res.json({ success: true, order: mi(order) });
  } catch {
    res.status(500).json({ success: false, message: "Failed to confirm payment. Contact support." });
  }
});

// POST /api/v1/payments/webhook
// Razorpay webhook — reconciles payments when browser closes before verify (M6)
// Set RAZORPAY_WEBHOOK_SECRET env var (from Razorpay dashboard) to enable signature verification
router.post("/webhook", async (req: Request & { rawBody?: Buffer }, res: Response): Promise<void> => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (webhookSecret) {
    const signature = req.headers["x-razorpay-signature"] as string | undefined;
    if (!signature) {
      res.status(400).json({ success: false, message: "Missing webhook signature" });
      return;
    }
    const rawBody = req.rawBody;
    if (!rawBody) {
      res.status(400).json({ success: false, message: "Cannot verify signature" });
      return;
    }
    const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    if (expected !== signature) {
      res.status(400).json({ success: false, message: "Invalid webhook signature" });
      return;
    }
  }

  const event = req.body as {
    event?: string;
    payload?: { payment?: { entity?: { order_id?: string; id?: string } } };
  };

  if (event.event === "payment.captured") {
    const razorpayOrderId = event.payload?.payment?.entity?.order_id;
    const razorpayPaymentId = event.payload?.payment?.entity?.id;
    if (razorpayOrderId) {
      await db.update(orders)
        .set({ paymentStatus: "success", razorpayPaymentId: razorpayPaymentId })
        .where(eq(orders.razorpayOrderId, razorpayOrderId))
        .catch(() => {});
    }
  }

  if (event.event === "payment.failed") {
    const razorpayOrderId = event.payload?.payment?.entity?.order_id;
    if (razorpayOrderId) {
      // Cancel the order and restore stock when Razorpay confirms payment failure (C5/M6)
      const [affected] = await db.select({ id: orders.id })
        .from(orders)
        .where(eq(orders.razorpayOrderId, razorpayOrderId))
        .limit(1)
        .catch(() => []);
      if (affected) {
        await cancelOrderAndRestoreStock(affected.id, "Payment failed via Razorpay.").catch(() => {});
      }
    }
  }

  res.json({ success: true });
});

export default router;
