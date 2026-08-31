import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export type BlockType =
  | "hero_banner"
  | "category_grid"
  | "product_carousel"
  | "promotional_strip"
  | "spacer"
  | "daily_regulars"
  | "weather_cravings"
  | "shoppable_recipe"
  | "super_store_showcase";

export interface LayoutBlock {
  id: string;
  type: BlockType;
  sortOrder: number;
  isActive: boolean;
  data: Record<string, any>;
}

export const appLayouts = pgTable("app_layouts", {
  id:        text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  pageName:  text("page_name").notNull().unique(),
  blocks:    jsonb("blocks").$type<LayoutBlock[]>().notNull().default([]),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AppLayout = typeof appLayouts.$inferSelect;
export type InsertAppLayout = typeof appLayouts.$inferInsert;
