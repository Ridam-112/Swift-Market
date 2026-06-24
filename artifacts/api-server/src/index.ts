import app from "./app.js";
import { logger } from "./lib/logger.js";
import { seedSuperAdmins } from "./utils/seedAdmins.js";
import { seedShopTypes } from "./utils/seedShopTypes.js";
import { seedCategories } from "./utils/seedCategories.js";
import { clearDemoData } from "./utils/seedDemoData.js";
import { cleanupAbandonedOrders } from "./utils/orderCleanup.js";
import { OTP_MODE } from "./lib/sms.js";

// AUTH_MODE controls which login methods are enabled (otp | google | both).
// Default is "otp" — safe to run without a domain or Google OAuth credentials.
type AuthMode = "otp" | "google" | "both";
const AUTH_MODE: AuthMode = (process.env["AUTH_MODE"] as AuthMode | undefined) ?? "otp";

// Fail fast on missing required secrets; warn on missing optional ones at boot time
// so issues surface in logs immediately rather than on first customer request.
function validateEnv(): void {
  const required = ["DATABASE_URL", "JWT_SECRET", "JWT_REFRESH_SECRET", "PORT"];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const optionalWarnings: Array<[string, string]> = [
    ["RAZORPAY_KEY_ID",       "Razorpay payments will not work"],
    ["RAZORPAY_KEY_SECRET",   "Razorpay payments will not work"],
    ["CLOUDINARY_CLOUD_NAME", "Image uploads will not work"],
    ["CLOUDINARY_API_KEY",    "Image uploads will not work"],
    ["CLOUDINARY_API_SECRET", "Image uploads will not work"],
    ["TWO_FACTOR_API_KEY",    "OTP SMS will not work (set OTP_MODE=demo to suppress)"],
    ["FIREBASE_PROJECT_ID",   "FCM push notifications will not work"],
    ["FIREBASE_CLIENT_EMAIL", "FCM push notifications will not work"],
    ["FIREBASE_PRIVATE_KEY",  "FCM push notifications will not work"],
  ];
  for (const [key, impact] of optionalWarnings) {
    if (!process.env[key]) {
      logger.warn({ key }, `Optional secret missing — ${impact}`);
    }
  }
}

validateEnv();

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
        { otpMode: OTP_MODE, authMode: AUTH_MODE, twoFactorKeyPresent: !!process.env["TWO_FACTOR_API_KEY"] },
        `Auth mode: ${AUTH_MODE} | OTP mode: ${OTP_MODE} | 2Factor key present: ${!!process.env["TWO_FACTOR_API_KEY"]}`
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

  // Background job: cancel online-payment orders stuck pending > 15 min
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
