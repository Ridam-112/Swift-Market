import { User } from "../models/User.js";
import { Shop } from "../models/Shop.js";
import { Product } from "../models/Product.js";
import { logger } from "../lib/logger.js";

const DEMO_PHONES = ["9000000001", "9000000002", "9000000003"];
const DEMO_PAN_PREFIX = "DEMO";

/**
 * clearDemoData — removes all demo/seed shops, their products, and demo vendor
 * users from MongoDB. Safe to call repeatedly (idempotent no-op when already clean).
 */
export async function clearDemoData(): Promise<void> {
  const demoShops = await Shop.find({
    $or: [
      { phone: { $in: DEMO_PHONES } },
      { panNumber: { $regex: `^${DEMO_PAN_PREFIX}` } },
    ],
  }).select("_id").lean();

  if (demoShops.length === 0) {
    logger.info("clearDemoData: no demo data found — already clean");
    return;
  }

  const demoShopIds = demoShops.map(s => String(s._id));

  const [productsResult, shopsResult, usersResult] = await Promise.all([
    Product.deleteMany({ shopId: { $in: demoShopIds } }),
    Shop.deleteMany({ _id: { $in: demoShopIds } }),
    User.deleteMany({ phone: { $in: DEMO_PHONES } }),
  ]);

  logger.info(
    {
      shops: shopsResult.deletedCount,
      products: productsResult.deletedCount,
      users: usersResult.deletedCount,
    },
    "clearDemoData: demo data purged"
  );
}
