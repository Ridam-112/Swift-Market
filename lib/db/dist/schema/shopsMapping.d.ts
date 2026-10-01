/**
 * shops_mapping — DB1 only
 * Maps each SwiftMart shopId to the shard database number (2, 3, 4, or 5)
 * that holds that shop's data (shops, products, orders, payouts, buckets, etc.)
 *
 * This table lives exclusively in DATABASE1 and is used by the database
 * router to resolve which shard to query. Never replicated to shards.
 */
export declare const shopsMapping: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "shops_mapping";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "shops_mapping";
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
        shopId: import("drizzle-orm/pg-core").PgColumn<{
            name: "shop_id";
            tableName: "shops_mapping";
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
        databaseNo: import("drizzle-orm/pg-core").PgColumn<{
            name: "database_no";
            tableName: "shops_mapping";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "shops_mapping";
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
export type ShopsMapping = typeof shopsMapping.$inferSelect;
export type InsertShopsMapping = typeof shopsMapping.$inferInsert;
//# sourceMappingURL=shopsMapping.d.ts.map