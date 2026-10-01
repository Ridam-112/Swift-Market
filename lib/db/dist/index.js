import { drizzle } from "drizzle-orm/node-postgres";
import { withReplicas } from "drizzle-orm/pg-core";
import pg from "pg";
import * as schema from "./schema/index.js";
const { Pool } = pg;
// ── 5 Neon Database Connection Strings ─────────────────────────────────────────
export const DB_URLS = [
    process.env.DATABASE_URL || process.env.DATABASE1_URL || "postgresql://neondb_owner:npg_wyr4mq0sbZvV@ep-calm-glitter-aoeraspe-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    process.env.DATABASE2_URL || "postgresql://neondb_owner:npg_U38WKbfcFLwB@ep-lucky-shape-azpdcnzz-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    process.env.DATABASE3_URL || "postgresql://neondb_owner:npg_5xQCT9dNgqRS@ep-small-violet-azvsq53k-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    process.env.DATABASE4_URL || "postgresql://neondb_owner:npg_4enZGx0fHDIv@ep-dawn-unit-azzrimbp-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    process.env.DATABASE5_URL || "postgresql://neondb_owner:npg_tFHT9NoO5Cvy@ep-dark-tooth-az6x4682-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
].filter((url) => Boolean(url && url.trim().length > 0));
function createPgPool(connectionString, index) {
    const isNeon = connectionString.includes("neon") ||
        connectionString.includes("sslmode=require");
    const poolInstance = new Pool({
        connectionString,
        ssl: isNeon ? { rejectUnauthorized: false } : undefined,
        max: 5, // Keep small pool size so we never exceed Neon limits
        idleTimeoutMillis: 15_000, // 15s idle timeout: Neon auto-suspends to save 90% Compute Hours!
        connectionTimeoutMillis: 10_000,
        keepAlive: true,
    });
    poolInstance.on("error", (err) => {
        console.error(`[DB-${index + 1}] Idle client error:`, err.message);
    });
    return poolInstance;
}
// ── Multi-Pool Initialization ─────────────────────────────────────────────────
const pools = DB_URLS.map((url, i) => createPgPool(url, i));
const dbInstances = pools.map((p) => drizzle(p, { schema }));
export const pool = pools[0];
export const primaryDb = dbInstances[0];
export const replicaDbs = dbInstances.slice(1);
// ── Smart Read Load Balancer across all Replicas ──────────────────────────────
let readCounter = 0;
function getHealthyReplica(replicas) {
    if (!replicas || replicas.length === 0)
        return primaryDb;
    const idx = readCounter++ % replicas.length;
    return replicas[idx];
}
// ── Drizzle withReplicas ──────────────────────────────────────────────────────
// Routes all SELECT, selectDistinct, $count, query to DB-2, DB-3, DB-4, DB-5 in round-robin.
// Routes all INSERT, UPDATE, DELETE, transactions to primary Master DB-1.
export const db = (replicaDbs.length > 0
    ? withReplicas(primaryDb, replicaDbs, (reps) => getHealthyReplica(reps))
    : primaryDb);
console.log(`[DB] 5-Database Sharded Read/Write Multi-Pool active: 1 Primary Writer + ${replicaDbs.length} Read Replicas (Total ${DB_URLS.length} Neon DBs).`);
export * from "./schema/index.js";
