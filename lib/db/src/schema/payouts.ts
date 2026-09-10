import { pgTable, text, timestamp, doublePrecision, jsonb, boolean, index } from "drizzle-orm/pg-core";

export const payouts = pgTable("payouts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  vendorId: text("vendor_id").notNull(),
  vendorName: text("vendor_name").notNull().default(""),
  shopId: text("shop_id").notNull(),
  cityId: text("city_id"),
  orderId: text("order_id"),
  orderNumber: text("order_number"),
  amount: doublePrecision("amount").notNull().default(0),
  orderTotal: doublePrecision("order_total").notNull().default(0),
  commissionAmount: doublePrecision("commission_amount").notNull().default(0),
  deductionAmount: doublePrecision("deduction_amount").notNull().default(0),
  adjustedReason: text("adjusted_reason"),
  status: text("status").notNull().default("pending"),
  ordersIncluded: jsonb("orders_included").notNull().default([]),
  scheduledDate: timestamp("scheduled_date"),
  earlyPayoutRequested: boolean("early_payout_requested").notNull().default(false),
  earlyPayoutRequestedAt: timestamp("early_payout_requested_at"),
  earlyPayoutReason: text("early_payout_reason"),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("payouts_vendor_id_idx").on(t.vendorId),
  index("payouts_shop_id_idx").on(t.shopId),
  index("payouts_status_idx").on(t.status),
  index("payouts_early_requested_idx").on(t.earlyPayoutRequested),
]);

export type Payout = typeof payouts.$inferSelect;
export type InsertPayout = typeof payouts.$inferInsert;
