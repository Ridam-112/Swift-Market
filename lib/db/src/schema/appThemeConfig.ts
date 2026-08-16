import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const appThemeConfig = pgTable("app_theme_config", {
  id:             text("id").primaryKey().$defaultFn(() => "global_theme"),
  primaryColor:   text("primary_color").notNull().default("#E23744"),
  secondaryColor: text("secondary_color").notNull().default("#000000"),
  borderRadius:   integer("border_radius").notNull().default(12),
  fontFamily:     text("font_family").notNull().default("Outfit"),
  customTokens:   jsonb("custom_tokens").$type<Record<string, unknown>>().notNull().default({}),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
});

export type AppThemeConfig = typeof appThemeConfig.$inferSelect;
export type InsertAppThemeConfig = typeof appThemeConfig.$inferInsert;
