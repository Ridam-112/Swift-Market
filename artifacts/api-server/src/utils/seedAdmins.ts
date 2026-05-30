import { Admin } from "../models/Admin.js";
import { User } from "../models/User.js";
import { logger } from "../lib/logger.js";

const SUPER_ADMIN_PHONES = (process.env["SUPER_ADMIN_PHONES"] ?? "6296118949,7602584238")
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean);

export async function seedSuperAdmins(): Promise<void> {
  for (const phone of SUPER_ADMIN_PHONES) {
    const existingAdmin = await Admin.findOne({ phone });
    if (!existingAdmin) {
      await Admin.create({ phone, name: "Super Admin", role: "super_admin", status: "active" });
      logger.info({ phone }, "Super admin seeded in Admin collection");
    }
    const existingUser = await User.findOne({ phone });
    if (!existingUser) {
      await User.create({ phone, name: "Super Admin", role: "super_admin", status: "active" });
      logger.info({ phone }, "Super admin seeded in User collection");
    } else if (existingUser.role !== "super_admin") {
      await User.updateOne({ phone }, { role: "super_admin" });
    }
  }
}
