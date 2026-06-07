import app from "./app.js";
import { logger } from "./lib/logger.js";
import { connectMongoDB } from "./lib/mongoose.js";
import { seedSuperAdmins } from "./utils/seedAdmins.js";
import { seedShopTypes } from "./utils/seedShopTypes.js";
import { seedCategories } from "./utils/seedCategories.js";
import { clearDemoData } from "./utils/seedDemoData.js";

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
      resolve();
    });
  });

  // Connect DB in background — server stays up even if Atlas is unreachable
  connectMongoDB()
    .then(async () => {
      try {
        await seedSuperAdmins();
        await seedShopTypes();
        await seedCategories();
        await clearDemoData();
        logger.info("Seed complete");
      } catch (err) {
        logger.error({ err }, "Seed error (non-fatal)");
      }
    })
    .catch((err) => {
      logger.error({ err }, "MongoDB connection error (non-fatal) — check Atlas IP whitelist");
    });
}

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
