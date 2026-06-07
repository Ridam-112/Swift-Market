import { pgTable, text, timestamp, doublePrecision, jsonb } from "drizzle-orm/pg-core";

export const payouts = pgTable("payouts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  vendorId: text("vendor_id").notNull(),
  vendorName: text("vendor_name").notNull().default(""),
  shopId: text("shop_id").notNull(),
  amount: doublePrecision("amount").notNull().default(0),
  orderTotal: doublePrecision("order_total").notNull().default(0),
  commissionAmount: doublePrecision("commission_amount").notNull().default(0),
  status: text("status").notNull().default("pending"),
  ordersIncluded: jsonb("orders_included").notNull().default([]),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Payout = typeof payouts.$inferSelect;
export type InsertPayout = typeof payouts.$inferInsert;
