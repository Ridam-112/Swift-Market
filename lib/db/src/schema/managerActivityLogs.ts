import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const managerActivityLogs = pgTable("manager_activity_logs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  managerId: text("manager_id").notNull(),
  managerName: text("manager_name").notNull(),
  cityId: text("city_id"),
  action: text("action").notNull(),
  details: text("details").notNull().default(""),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ManagerActivityLog = typeof managerActivityLogs.$inferSelect;
export type InsertManagerActivityLog = typeof managerActivityLogs.$inferInsert;
