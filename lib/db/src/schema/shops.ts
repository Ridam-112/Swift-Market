import { pgTable, text, timestamp, boolean, doublePrecision, integer, jsonb } from "drizzle-orm/pg-core";

export const shops = pgTable("shops", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  shopName: text("shop_name").notNull(),
  ownerName: text("owner_name").notNull().default(""),
  phone: text("phone").notNull(),
  ownerId: text("owner_id").notNull(),
  address: jsonb("address").notNull().default({}),
  shopType: text("shop_type"),
  category: text("category"),
  subcategory: text("subcategory"),
  description: text("description"),
  image: text("image"),
  banner: text("banner"),
  timings: jsonb("timings").default({}),
  commissionRate: doublePrecision("commission_rate").default(5),
  status: text("status").notNull().default("pending"),
  isOpen: boolean("is_open").notNull().default(false),
  rating: doublePrecision("rating").default(0),
  totalOrders: integer("total_orders").default(0),
  totalRevenue: doublePrecision("total_revenue").default(0),
  panNumber: text("pan_number"),
  gstNumber: text("gst_number"),
  bankAccountNumber: text("bank_account_number"),
  bankIfscCode: text("bank_ifsc_code"),
  upiId: text("upi_id"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Shop = typeof shops.$inferSelect;
export type InsertShop = typeof shops.$inferInsert;
