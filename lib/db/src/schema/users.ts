import { pgTable, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().default("User"),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  googleId: text("google_id"),
  role: text("role").notNull().default("customer"),
  status: text("status").notNull().default("active"),
  vendorStatus: text("vendor_status").notNull().default("none"),
  pincode: text("pincode"),
  addresses: jsonb("addresses").notNull().default([]),
  tokenVersion: integer("token_version").notNull().default(1),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
