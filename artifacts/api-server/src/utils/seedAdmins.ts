import { db, admins, users } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const SUPER_ADMIN_PHONES = (process.env["SUPER_ADMIN_PHONES"] ?? "6296118949,7602584238")
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean);

export async function seedSuperAdmins(): Promise<void> {
  for (const phone of SUPER_ADMIN_PHONES) {
    const [existingAdmin] = await db.select().from(admins).where(eq(admins.phone, phone)).limit(1);
    if (!existingAdmin) {
      await db.insert(admins).values({ phone, name: "Super Admin", role: "super_admin", status: "active" });
      logger.info({ phone }, "Super admin seeded in admins table");
    }

    const [existingUser] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    if (!existingUser) {
      await db.insert(users).values({ phone, name: "Super Admin", role: "super_admin", status: "active" });
      logger.info({ phone }, "Super admin seeded in users table");
    } else if (existingUser.role !== "super_admin") {
      await db.update(users).set({ role: "super_admin" }).where(eq(users.phone, phone));
    }
  }
}
