import { Router, type Request, type Response } from "express";
import { db, coupons, orders } from "@workspace/db";
import { eq, and, desc, count, ne } from "drizzle-orm";
import { authenticate, requireRole, type AuthRequest } from "../../middlewares/auth.js";
import { mi, miArr } from "../../utils/mapId.js";

const router = Router();
const A = requireRole("admin", "super_admin");

router.get("/", authenticate, A, async (_req: Request, res: Response): Promise<void> => {
  const rows = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
  res.json({ success: true, coupons: miArr(rows) });
});

// POST /validate — validate a coupon code against an order total
router.post("/validate", authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { code, orderTotal } = req.body as { code: string; orderTotal: number };
  const [coupon] = await db.select().from(coupons)
    .where(and(eq(coupons.code, code.toUpperCase()), eq(coupons.isActive, true)))
    .limit(1);
  if (!coupon) { res.status(404).json({ success: false, message: "Invalid coupon code" }); return; }
  if (coupon.expiryDate < new Date()) { res.status(400).json({ success: false, message: "Coupon expired" }); return; }
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    res.status(400).json({ success: false, message: "Coupon usage limit reached" });
    return;
  }
  if (orderTotal < coupon.minimumOrder) {
    res.status(400).json({ success: false, message: `Minimum order ₹${coupon.minimumOrder} required` });
    return;
  }

  // Enforce per-user limit (M4)
  if (coupon.perUserLimit > 0) {
    const userId = req.user!.userId;
    const [{ uses }] = await db
      .select({ uses: count() })
      .from(orders)
      .where(and(
        eq(orders.customerId, userId),
        eq(orders.couponCode, coupon.code),
        ne(orders.status, "cancelled"),
        ne(orders.status, "refunded"),
      ));
    if (Number(uses) >= coupon.perUserLimit) {
      res.status(400).json({
        success: false,
        message: `You've already used this coupon ${coupon.perUserLimit} time${coupon.perUserLimit > 1 ? "s" : ""} (limit reached)`,
      });
      return;
    }
  }

  let discount = 0;
  if (coupon.type === "percentage") {
    discount = Math.min((orderTotal * coupon.value) / 100, coupon.maximumDiscount ?? Infinity);
  } else if (coupon.type === "fixed") {
    discount = Math.min(coupon.value, orderTotal);
  }
  res.json({ success: true, coupon: mi(coupon), discount: +discount.toFixed(2) });
});

router.post("/", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const [coupon] = await db.insert(coupons).values({
    code: String(body["code"] ?? "").toUpperCase(),
    type: body["type"] ? String(body["type"]) : "percentage",
    value: body["value"] != null ? Number(body["value"]) : 0,
    minimumOrder: body["minimumOrder"] != null ? Number(body["minimumOrder"]) : 0,
    maximumDiscount: body["maximumDiscount"] != null ? Number(body["maximumDiscount"]) : undefined,
    expiryDate: new Date(String(body["expiryDate"] ?? "")),
    usageLimit: body["usageLimit"] != null ? Number(body["usageLimit"]) : 0,
    perUserLimit: body["perUserLimit"] != null ? Number(body["perUserLimit"]) : 0,
    isActive: body["isActive"] != null ? Boolean(body["isActive"]) : true,
    appliesTo: body["appliesTo"] ? String(body["appliesTo"]) : "all",
    targetId: body["targetId"] ? String(body["targetId"]) : undefined,
  }).returning();
  res.status(201).json({ success: true, coupon: mi(coupon!) });
});

router.patch("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  const [coupon] = await db.update(coupons)
    .set(req.body as Record<string, unknown>)
    .where(eq(coupons.id, req.params["id"]!))
    .returning();
  if (!coupon) { res.status(404).json({ success: false, message: "Not found" }); return; }
  res.json({ success: true, coupon: mi(coupon) });
});

router.delete("/:id", authenticate, A, async (req: AuthRequest, res: Response): Promise<void> => {
  await db.delete(coupons).where(eq(coupons.id, req.params["id"]!));
  res.json({ success: true, message: "Deleted" });
});

export default router;
