import { Router } from "express";
import authRouter from "./auth.js";
import adminRouter from "./admin.js";
import usersRouter from "./users.js";
import shopsRouter from "./shops.js";
import shopTypesRouter from "./shopTypes.js";
import categoriesRouter from "./categories.js";
import productsRouter from "./products.js";
import ordersRouter from "./orders.js";
import couponsRouter from "./coupons.js";
import commissionsRouter from "./commissions.js";
import deliveryRouter from "./delivery.js";
import payoutsRouter from "./payouts.js";
import reportsRouter from "./reports.js";
import notificationsRouter from "./notifications.js";
import uploadRouter from "./upload.js";
import heroBannersRouter from "./hero-banners.js";
import paymentsRouter from "./payments.js";
import pushRouter from "./push.js";
import fcmRouter from "./fcm.js";
import supportRouter from "./support.js";
import analyticsRouter from "./analytics.js";
import homepageSectionsRouter from "./homepage-sections.js";
import servicePincodesRouter from "./servicePincodes.js";
import bucketsRouter from "./buckets.js";
import maintenanceBypassRouter from "./maintenanceBypass.js";
import managerRouter from "./manager.js";
import { db, categories } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { miArr } from "../../utils/mapId.js";

const router = Router();

// GET /api/home-filters — public: fetch homepage pill filters grouped by parent tab
router.get("/home-filters", async (_req, res): Promise<void> => {
  try {
    const list = await db.select()
      .from(categories)
      .where(and(eq(categories.isActive, true), eq(categories.showOnHome, true)))
      .orderBy(asc(categories.filterOrder));

    const mapped = miArr(list);

    const grouped: Record<string, typeof mapped> = {
      swiftmart: [],
      super: [],
      food: [],
      rakhi: [],
    };

    for (const item of mapped) {
      const tab = item.homeTab || "swiftmart";
      if (!grouped[tab]) {
        grouped[tab] = [];
      }
      grouped[tab].push(item);
    }

    res.json({ success: true, filters: grouped });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to load home filters", error: String(err) });
  }
});

router.use("/auth", authRouter);
router.use("/admin", adminRouter);
router.use("/users", usersRouter);
router.use("/shops", shopsRouter);
router.use("/shop-types", shopTypesRouter);
router.use("/categories", categoriesRouter);
router.use("/products", productsRouter);
router.use("/orders", ordersRouter);
router.use("/coupons", couponsRouter);
router.use("/commissions", commissionsRouter);
router.use("/delivery", deliveryRouter);
router.use("/payouts", payoutsRouter);
router.use("/reports", reportsRouter);
router.use("/notifications", notificationsRouter);
router.use("/upload", uploadRouter);
router.use("/hero-banners", heroBannersRouter);
router.use("/payments", paymentsRouter);
router.use("/push", pushRouter);
router.use("/fcm", fcmRouter);
router.use("/support", supportRouter);
router.use("/admin/analytics", analyticsRouter);
router.use("/homepage-sections", homepageSectionsRouter);
router.use("/service-pincodes", servicePincodesRouter);
router.use("/buckets", bucketsRouter);
router.use("/maintenance-bypass", maintenanceBypassRouter);
router.use("/manager", managerRouter);

export default router;
