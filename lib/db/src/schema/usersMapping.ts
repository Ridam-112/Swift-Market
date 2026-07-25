import { pgTable, text, integer, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * users_mapping — DB1 only
 * Maps each SwiftMart userId to the shard database number (2, 3, 4, or 5)
 * that holds that user's application data (notifications, fcmTokens, etc.)
 *
 * This table lives exclusively in DATABASE1 and is used by the database
 * router to resolve which shard to query. Never replicated to shards.
 */
export const usersMapping = pgTable("users_mapping", {
  id:         text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:     text("user_id").notNull(),
  databaseNo: integer("database_no").notNull(),  // 2 | 3 | 4 | 5
  createdAt:  timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("users_mapping_user_id_idx").on(t.userId),
  index("users_mapping_database_no_idx").on(t.databaseNo),
]);

export type UsersMapping    = typeof usersMapping.$inferSelect;
export type InsertUsersMapping = typeof usersMapping.$inferInsert;
