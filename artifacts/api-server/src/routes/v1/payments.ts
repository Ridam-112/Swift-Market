import { Router, type Response } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { db, orders } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../../middlewares/auth.js";
import { mi } from "../../utils/mapId.js";

const router = Router();

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay credentials not configured");
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// POST /api/v1/payments/create-order
// Creates a Razorpay order for the given amount (in paise)
router.post("/create-order", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { amount, currency = "INR", receipt } = req.body as {
    amount: number;
    currency?: string;
    receipt?: string;
  };

  if (!amount || amount < 1) {
    res.status(400).json({ success: false, message: "Invalid amount" });
    return;
  }

  try {
    const keyId = process.env.RAZORPAY_KEY_ID!;
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency,
      receipt: receipt ?? `rcpt_${Date.now()}`,
    });
    res.json({ success: true, order, keyId });
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

export default router;
