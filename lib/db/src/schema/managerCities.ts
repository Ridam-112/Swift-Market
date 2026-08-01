import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const managerCities = pgTable("manager_cities", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  managerId: text("manager_id").notNull(),
  cityId: text("city_id").notNull(),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
});

export type ManagerCity = typeof managerCities.$inferSelect;
export type InsertManagerCity = typeof managerCities.$inferInsert;
