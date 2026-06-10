import app from "./app.js";
import { logger } from "./lib/logger.js";
import { seedSuperAdmins } from "./utils/seedAdmins.js";
import { seedShopTypes } from "./utils/seedShopTypes.js";
import { seedCategories } from "./utils/seedCategories.js";
import { clearDemoData } from "./utils/seedDemoData.js";
import { cleanupAbandonedOrders } from "./utils/orderCleanup.js";
import { OTP_MODE } from "./lib/sms.js";

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

async function main() {
  // Start HTTP server first so health endpoint responds immediately
  await new Promise<void>((resolve, reject) => {
    app.listen(port, (err) => {
      if (err) { reject(err); return; }
      logger.info({ port }, "SwiftMart API Server listening");
      logger.info(
        { otpMode: OTP_MODE, fast2smsKeyPresent: !!process.env["FAST2SMS_API_KEY"] },
        `OTP mode: ${OTP_MODE} | Fast2SMS key present: ${!!process.env["FAST2SMS_API_KEY"]}`
      );
      resolve();
    });
  });

  // Run seeds against PostgreSQL (Drizzle / Neon)
  try {
    await seedSuperAdmins();
    await seedShopTypes();
    await seedCategories();
    await clearDemoData();
    logger.info("Seed complete");
  } catch (err) {
    logger.error({ err }, "Seed error (non-fatal)");
  }

  // Background job: cancel online-payment orders stuck pending > 15 min (C5)
  // Run once on startup, then every 10 minutes
  const runCleanup = async () => {
    try {
      const count = await cleanupAbandonedOrders();
      if (count > 0) logger.info({ count }, "Cleaned up abandoned payment orders");
    } catch (err) {
      logger.error({ err }, "cleanupAbandonedOrders error (non-fatal)");
    }
  };
  void runCleanup();
  setInterval(runCleanup, 10 * 60 * 1000);
}

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
