import { pgTable, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const otpSessions = pgTable("otp_sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  phone: text("phone").notNull(),
  otp: text("otp").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verified: boolean("verified").notNull().default(false),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type OtpSession = typeof otpSessions.$inferSelect;
export type InsertOtpSession = typeof otpSessions.$inferInsert;
