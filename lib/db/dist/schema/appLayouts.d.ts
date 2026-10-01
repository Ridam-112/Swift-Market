export type BlockType = "hero_banner" | "category_grid" | "product_carousel" | "promotional_strip" | "spacer" | "daily_regulars" | "weather_cravings" | "shoppable_recipe" | "super_store_showcase";
export interface LayoutBlock {
    id: string;
    type: BlockType;
    sortOrder: number;
    isActive: boolean;
    data: Record<string, any>;
}
export declare const appLayouts: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "app_layouts";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "app_layouts";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        pageName: import("drizzle-orm/pg-core").PgColumn<{
            name: "page_name";
            tableName: "app_layouts";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        blocks: import("drizzle-orm/pg-core").PgColumn<{
            name: "blocks";
            tableName: "app_layouts";
            dataType: "json";
            columnType: "PgJsonb";
            data: LayoutBlock[];
            driverParam: unknown;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: LayoutBlock[];
        }>;
        updatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "updated_at";
            tableName: "app_layouts";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export type AppLayout = typeof appLayouts.$inferSelect;
export type InsertAppLayout = typeof appLayouts.$inferInsert;
//# sourceMappingURL=appLayouts.d.ts.map