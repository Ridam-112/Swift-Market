import { pgTable, text, timestamp, boolean, doublePrecision, integer, jsonb, index } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const deliveryPartners = pgTable("delivery_partners", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  cityId: text("city_id"),
  vehicle: text("vehicle"),
  applicationStatus: text("application_status").notNull().default("approved"), // "pending" | "approved" | "rejected"
  fcmToken: text("fcm_token"),
  panNumber: text("pan_number"),
  dlNumber: text("dl_number"),
  rcNumber: text("rc_number"),
  documents: jsonb("documents").default({}),
  rejectionReason: text("rejection_reason"),
  isAvailable: boolean("is_available").notNull().default(true),
  status: text("status").notNull().default("active"),
  totalEarnings: doublePrecision("total_earnings").notNull().default(0),
  ordersDelivered: integer("orders_delivered").notNull().default(0),
  currentOrderId: text("current_order_id"),
  currentLat: doublePrecision("current_lat"),
  currentLon: doublePrecision("current_lon"),
  locationUpdatedAt: timestamp("location_updated_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("delivery_partners_user_id_idx").on(t.userId),
  index("delivery_partners_status_available_idx").on(t.status, t.isAvailable),
]);

export type DeliveryPartner = typeof deliveryPartners.$inferSelect;
export type InsertDeliveryPartner = typeof deliveryPartners.$inferInsert;
