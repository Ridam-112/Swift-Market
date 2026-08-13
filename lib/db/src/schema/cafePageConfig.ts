import { pgTable, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";

export const cafePageConfig = pgTable("cafe_page_config", {
  id:              text("id").primaryKey().$defaultFn(() => "default_cafe_page"),
  isActive:        boolean("is_active").notNull().default(false),
  theme:           jsonb("theme").notNull().default({
                     backgroundColor: "#FFF8F0",
                     textColor: "#8A252C",
                     accentColor: "#F3A738"
                   }),
  layoutBlocks:    jsonb("layout_blocks").notNull().default([]),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

export type CafePageConfig = typeof cafePageConfig.$inferSelect;
export type InsertCafePageConfig = typeof cafePageConfig.$inferInsert;
