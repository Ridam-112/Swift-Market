import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
export const appLayouts = pgTable("app_layouts", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    pageName: text("page_name").notNull().unique(),
    blocks: jsonb("blocks").$type().notNull().default([]),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
