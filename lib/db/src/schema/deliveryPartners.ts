import { pgTable, text, timestamp, boolean, doublePrecision, integer } from "drizzle-orm/pg-core";

export const deliveryPartners = pgTable("delivery_partners", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  userId: text("user_id"),
  vehicle: text("vehicle"),
  isAvailable: boolean("is_available").notNull().default(true),
  status: text("status").notNull().default("active"),
  totalEarnings: doublePrecision("total_earnings").notNull().default(0),
  ordersDelivered: integer("orders_delivered").notNull().default(0),
  currentOrderId: text("current_order_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type DeliveryPartner = typeof deliveryPartners.$inferSelect;
export type InsertDeliveryPartner = typeof deliveryPartners.$inferInsert;
