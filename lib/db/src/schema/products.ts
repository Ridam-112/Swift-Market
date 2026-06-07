import { pgTable, text, timestamp, boolean, doublePrecision, integer, jsonb } from "drizzle-orm/pg-core";

export const products = pgTable("products", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  price: doublePrecision("price").notNull().default(0),
  discountedPrice: doublePrecision("discounted_price"),
  category: text("category"),
  subcategory: text("subcategory"),
  shopId: text("shop_id").notNull(),
  images: jsonb("images").notNull().default([]),
  stock: integer("stock").notNull().default(0),
  sku: text("sku"),
  unit: text("unit"),
  rating: doublePrecision("rating").default(0),
  commissionRate: doublePrecision("commission_rate"),
  status: text("status").notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  trending: boolean("trending").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
