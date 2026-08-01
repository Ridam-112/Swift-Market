import { db, users, shops, orders, deliveryPartners, payouts, coupons, supportTickets, cities, managerCities } from "@workspace/db";
import { isNull, eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";

// Founder phone & email — always get Balurghat manager assignment auto-synced
const FOUNDER_PHONES = ["6296118949"];
const FOUNDER_EMAILS = ["thrid5564@gmail.com"];

export async function migrateDataToBalurghat(): Promise<void> {
  logger.info("[migration] Starting Balurghat data migration check...");
  try {
    // 1. Ensure Balurghat is in cities
    await db.insert(cities).values({
      id: "balurghat",
      name: "Balurghat",
      isActive: true
    }).onConflictDoNothing();

    // 2. Migrate users (null cityId → balurghat)
    const usersRes = await db.update(users).set({ cityId: "balurghat" }).where(isNull(users.cityId)).returning();
    if (usersRes.length > 0) logger.info({ count: usersRes.length }, "[migration] Migrated users to Balurghat");

    // 3. Migrate shops
    const shopsRes = await db.update(shops).set({ cityId: "balurghat" }).where(isNull(shops.cityId)).returning();
    if (shopsRes.length > 0) logger.info({ count: shopsRes.length }, "[migration] Migrated shops to Balurghat");

    // 4. Migrate orders
    const ordersRes = await db.update(orders).set({ cityId: "balurghat" }).where(isNull(orders.cityId)).returning();
    if (ordersRes.length > 0) logger.info({ count: ordersRes.length }, "[migration] Migrated orders to Balurghat");

    // 5. Migrate deliveryPartners
    const dpRes = await db.update(deliveryPartners).set({ cityId: "balurghat" }).where(isNull(deliveryPartners.cityId)).returning();
    if (dpRes.length > 0) logger.info({ count: dpRes.length }, "[migration] Migrated deliveryPartners to Balurghat");

    // 6. Migrate coupons
    const couponsRes = await db.update(coupons).set({ cityId: "balurghat" }).where(isNull(coupons.cityId)).returning();
    if (couponsRes.length > 0) logger.info({ count: couponsRes.length }, "[migration] Migrated coupons to Balurghat");

    // 7. Migrate supportTickets
    const ticketsRes = await db.update(supportTickets).set({ cityId: "balurghat" }).where(isNull(supportTickets.cityId)).returning();
    if (ticketsRes.length > 0) logger.info({ count: ticketsRes.length }, "[migration] Migrated supportTickets to Balurghat");

    // 8. Migrate payouts
    const payoutsRes = await db.update(payouts).set({ cityId: "balurghat" }).where(isNull(payouts.cityId)).returning();
    if (payoutsRes.length > 0) logger.info({ count: payoutsRes.length }, "[migration] Migrated payouts to Balurghat");

    // 9. Auto-assign founder / super_admin accounts to Balurghat in managerCities.
    //    This ensures the Manager Panel shows Balurghat data immediately — no manual
    //    city assignment needed from the Admin Panel.
    const superAdmins = await db.select().from(users).where(eq(users.role, "super_admin"));

    for (const admin of superAdmins) {
      const isFounder =
        FOUNDER_PHONES.includes(admin.phone ?? "") ||
        FOUNDER_EMAILS.includes((admin.email ?? "").toLowerCase()) ||
        admin.role === "super_admin";

      if (isFounder) {
        await db.insert(managerCities)
          .values({ managerId: admin.id, cityId: "balurghat" })
          .onConflictDoNothing();
        logger.info({ userId: admin.id, phone: admin.phone }, "[migration] Auto-assigned super_admin to Balurghat manager panel");
      }
    }

    logger.info("[migration] Balurghat data migration check completed successfully.");
  } catch (err: any) {
    logger.error({ err: err.message }, "[migration] Error during Balurghat data migration check");
  }
}
