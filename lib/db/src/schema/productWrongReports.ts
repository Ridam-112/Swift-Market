import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";

export const productWrongReports = pgTable("product_wrong_reports", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  barcode: text("barcode").notNull(),
  reportedBy: text("reported_by"),
  shopId: text("shop_id"),
  actualName: text("actual_name"),
  photoUrl: text("photo_url"),
  note: text("note"),
  status: text("status").notNull().default("pending"), // pending, resolved, dismissed
  resolvedBy: text("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("product_wrong_reports_barcode_idx").on(t.barcode),
  index("product_wrong_reports_status_idx").on(t.status),
]);

export type ProductWrongReport = typeof productWrongReports.$inferSelect;
export type InsertProductWrongReport = typeof productWrongReports.$inferInsert;
