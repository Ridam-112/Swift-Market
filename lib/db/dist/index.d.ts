import * as schema from "./schema/index.js";
export declare const DB_URLS: string[];
export declare const pool: import("pg").Pool;
export declare const primaryDb: import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema> & {
    $client: import("pg").Pool;
};
export declare const replicaDbs: (import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema> & {
    $client: import("pg").Pool;
})[];
export declare const db: typeof primaryDb;
export * from "./schema/index.js";
//# sourceMappingURL=index.d.ts.map