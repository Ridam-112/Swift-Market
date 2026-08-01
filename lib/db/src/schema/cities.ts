import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const cities = pgTable("cities", {
  id: text("id").primaryKey(), // slug like 'balurghat', 'malda'
  name: text("name").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type City = typeof cities.$inferSelect;
export type InsertCity = typeof cities.$inferInsert;
