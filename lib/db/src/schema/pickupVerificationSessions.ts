import { pgTable, text, timestamp, doublePrecision, index } from "drizzle-orm/pg-core";
import { deliveryPartners } from "./deliveryPartners.js";
import { shops } from "./shops.js";

export const pickupVerificationSessions = pgTable("pickup_verification_sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  riderId: text("rider_id").notNull().references(() => deliveryPartners.id, { onDelete: "cascade" }),
  storeId: text("store_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  verifiedAt: timestamp("verified_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  riderLat: doublePrecision("rider_lat"),
  riderLon: doublePrecision("rider_lon"),
  status: text("status").notNull().default("active"), // "active" | "completed" | "expired"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("pickup_sessions_rider_store_idx").on(t.riderId, t.storeId),
  index("pickup_sessions_status_expires_idx").on(t.status, t.expiresAt),
]);

export type PickupVerificationSession = typeof pickupVerificationSessions.$inferSelect;
export type InsertPickupVerificationSession = typeof pickupVerificationSessions.$inferInsert;
