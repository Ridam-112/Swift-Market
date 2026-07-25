import { pgTable, text, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * shops_mapping — DB1 only
 * Maps each SwiftMart shopId to the shard database number (2, 3, 4, or 5)
 * that holds that shop's data (shops, products, orders, payouts, buckets, etc.)
 *
 * This table lives exclusively in DATABASE1 and is used by the database
 * router to resolve which shard to query. Never replicated to shards.
 */
export const shopsMapping = pgTable("shops_mapping", {
  id:         text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  shopId:     text("shop_id").notNull(),
  databaseNo: integer("database_no").notNull(),  // 2 | 3 | 4 | 5
  createdAt:  timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("shops_mapping_shop_id_idx").on(t.shopId),
  index("shops_mapping_database_no_idx").on(t.databaseNo),
]);

export type ShopsMapping    = typeof shopsMapping.$inferSelect;
export type InsertShopsMapping = typeof shopsMapping.$inferInsert;
