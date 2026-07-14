import { pgTable, text, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";

// "Bucket packages" — admin-curated product bundles that are highlighted on the
// customer home page (attention-seeker styling) and/or suggested as add-ons
// during cart/checkout ("buy something new" upsell).
export const buckets = pgTable("buckets", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  badgeText: text("badge_text").notNull().default("🔥 Hot Pick"),
  accentColor: text("accent_color").notNull().default("#FF6B35"),
  productIds: jsonb("product_ids").notNull().default([]),
  comboPrice: integer("combo_price"),
  showOnHomepage: boolean("show_on_homepage").notNull().default(true),
  showAsAddon: boolean("show_as_addon").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Bucket = typeof buckets.$inferSelect;
export type InsertBucket = typeof buckets.$inferInsert;
