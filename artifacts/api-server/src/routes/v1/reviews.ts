import { Router, type Response } from "express";
import { db, orders, users } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { authenticate, type AuthRequest } from "../../middlewares/auth.js";
import { logger } from "../../lib/logger.js";

const router = Router();

let tableInitialized = false;
async function ensureReviewsTable() {
  if (tableInitialized) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS reviews (
        id text PRIMARY KEY,
        order_id text NOT NULL,
        customer_id text NOT NULL,
        customer_name text DEFAULT '',
        shop_id text,
        rating integer NOT NULL DEFAULT 5,
        comment text DEFAULT '',
        created_at timestamp NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS reviews_order_idx ON reviews(order_id);
      CREATE INDEX IF NOT EXISTS reviews_shop_idx ON reviews(shop_id);
    `);
    tableInitialized = true;
  } catch (err: any) {
    logger.warn({ err: err?.message || err }, "reviews ensureReviewsTable warning");
  }
}

// POST /api/reviews — submit rating & feedback for an order
router.post("/", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureReviewsTable();
    const userId = req.user!.userId;
    const body = req.body as Record<string, any>;
    const orderId = String(body["orderId"] || "").trim();
    const rating = Math.max(1, Math.min(5, Number(body["rating"]) || 5));
    const comment = String(body["comment"] || "").trim();

    if (!orderId) {
      res.status(400).json({ success: false, message: "orderId is required" });
      return;
    }

    // Lookup order to get shopId & customerName
    let shopId: string | null = null;
    let customerName = "Customer";
    try {
      const [order] = await db.select({ shopId: orders.shopId, customerName: orders.customerName }).from(orders).where(eq(orders.id, orderId)).limit(1);
      if (order) {
        shopId = order.shopId;
        if (order.customerName) customerName = order.customerName;
      }
    } catch (_) {}

    const reviewId = crypto.randomUUID();
    await db.execute(sql`
      INSERT INTO reviews (id, order_id, customer_id, customer_name, shop_id, rating, comment, created_at)
      VALUES (${reviewId}, ${orderId}, ${userId}, ${customerName}, ${shopId}, ${rating}, ${comment}, NOW())
    `);

    res.status(201).json({
      success: true,
      message: "Thank you! Your rating and review have been submitted.",
      review: {
        id: reviewId,
        orderId,
        customerId: userId,
        customerName,
        shopId,
        rating,
        comment,
      },
    });
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "POST /api/reviews failed");
    res.status(500).json({ success: false, message: "Failed to submit review" });
  }
});

// GET /api/reviews/order/:orderId — get review for an order
router.get("/order/:orderId", async (req, res: Response): Promise<void> => {
  try {
    await ensureReviewsTable();
    const { orderId } = req.params;
    const result = await db.execute(sql`
      SELECT id, order_id as "orderId", customer_id as "customerId", customer_name as "customerName", shop_id as "shopId", rating, comment, created_at as "createdAt"
      FROM reviews WHERE order_id = ${orderId} LIMIT 1
    `);
    res.json({ success: true, review: result.rows?.[0] || null });
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "GET /api/reviews/order/:orderId failed");
    res.status(500).json({ success: false, message: "Failed to load review" });
  }
});

// GET /api/reviews/shop/:shopId — get all reviews for a shop
router.get("/shop/:shopId", async (req, res: Response): Promise<void> => {
  try {
    await ensureReviewsTable();
    const { shopId } = req.params;
    const result = await db.execute(sql`
      SELECT id, order_id as "orderId", customer_id as "customerId", customer_name as "customerName", shop_id as "shopId", rating, comment, created_at as "createdAt"
      FROM reviews WHERE shop_id = ${shopId} ORDER BY created_at DESC LIMIT 50
    `);
    res.json({ success: true, reviews: result.rows || [] });
  } catch (err: any) {
    logger.error({ err: err?.message || err }, "GET /api/reviews/shop/:shopId failed");
    res.status(500).json({ success: false, message: "Failed to load shop reviews" });
  }
});

export default router;
