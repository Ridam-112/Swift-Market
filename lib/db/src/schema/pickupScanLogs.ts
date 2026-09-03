import { pgTable, text, timestamp, doublePrecision, index } from "drizzle-orm/pg-core";

export const pickupScanLogs = pgTable("pickup_scan_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  riderId: text("rider_id").notNull(),
  riderName: text("rider_name"),
  storeId: text("store_id"),
  storeName: text("store_name"),
  orderId: text("order_id"),
  scannedToken: text("scanned_token"),
  scanResult: text("scan_result").notNull(), // "SUCCESS" | "WRONG_STORE" | "INVALID_QR" | "EXPIRED_QR" | "NO_ACTIVE_PICKUP" | "RIDER_NOT_ASSIGNED" | "ALREADY_PICKED_UP" | "TOO_FAR_FROM_STORE"
  reason: text("reason"),
  riderLat: doublePrecision("rider_lat"),
  riderLon: doublePrecision("rider_lon"),
  distanceMeters: doublePrecision("distance_meters"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("pickup_logs_store_id_idx").on(t.storeId),
  index("pickup_logs_rider_id_idx").on(t.riderId),
  index("pickup_logs_created_at_idx").on(t.createdAt),
]);

export type PickupScanLog = typeof pickupScanLogs.$inferSelect;
export type InsertPickupScanLog = typeof pickupScanLogs.$inferInsert;
