import { pgTable, text, timestamp, doublePrecision, jsonb, index } from "drizzle-orm/pg-core";

export const masterProducts = pgTable("master_products", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  barcode: text("barcode").unique(), // Normalized unique barcode (EAN-13, EAN-8, UPC-A, UPC-E, GTIN-14)
  gtin: text("gtin"),
  name: text("name").notNull(),
  brand: text("brand"),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  variant: text("variant"),
  netQuantity: text("net_quantity"),
  unit: text("unit"),
  mrp: doublePrecision("mrp").default(0),
  description: text("description"),
  primaryImage: text("primary_image"),
  images: jsonb("images").notNull().default([]),
  manufacturer: text("manufacturer"),
  countryOfOrigin: text("country_of_origin").default("India"),
  source: text("source").notNull().default("MANUAL"), // SWIFTMART, EXTERNAL, MANUAL
  verificationStatus: text("verification_status").notNull().default("VERIFIED"), // VERIFIED, PENDING_REVIEW, UNVERIFIED
  productType: text("product_type").notNull().default("PACKAGED"), // PACKAGED, LOOSE, FOOD, STORE_ITEM
  createdBy: text("created_by"),
  verifiedBy: text("verified_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("master_products_barcode_idx").on(t.barcode),
  index("master_products_name_idx").on(t.name),
  index("master_products_category_idx").on(t.category),
]);

export type MasterProduct = typeof masterProducts.$inferSelect;
export type InsertMasterProduct = typeof masterProducts.$inferInsert;
