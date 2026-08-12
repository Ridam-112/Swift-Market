import { pgTable, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";

export const seasonalCampaign = pgTable("seasonal_campaign", {
  id:              text("id").primaryKey().$defaultFn(() => "default_campaign"),
  isActive:        boolean("is_active").notNull().default(false),
  tabName:         text("tab_name").notNull().default("Festive Store"),
  theme:           jsonb("theme").notNull().default({
                     backgroundColor: "#FFF8F0",
                     textColor: "#8A252C",
                     accentColor: "#F3A738"
                   }),
  headerText:      jsonb("header_text").notNull().default({
                     topText: "Celebrate",
                     mainTitle: "Festive Season",
                     subText: "Joy, lights and happiness!"
                   }),
  gridBlocks:      jsonb("grid_blocks").notNull().default([]),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

export type SeasonalCampaign = typeof seasonalCampaign.$inferSelect;
export type InsertSeasonalCampaign = typeof seasonalCampaign.$inferInsert;
