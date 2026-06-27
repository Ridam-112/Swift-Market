import { pgTable, text, timestamp, jsonb, integer, index } from "drizzle-orm/pg-core";

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

  // Password-based auth (nullable — existing OTP users have no password yet)
  passwordHash: text("password_hash"),
  authProvider: text("auth_provider").notNull().default("otp"),
  profilePhoto: text("profile_photo"),

  // Password reset / setup token (only hashed value stored, never plaintext)
  passwordResetTokenHash: text("password_reset_token_hash"),
  passwordResetExpires: timestamp("password_reset_expires"),
}, (t) => [
  index("users_email_idx").on(t.email),
  index("users_google_id_idx").on(t.googleId),
  index("users_role_idx").on(t.role),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
