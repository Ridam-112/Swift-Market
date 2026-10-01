import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
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
].filter((url): url is string => Boolean(url && url.trim().length > 0));

function createPgPool(connectionString: string, index: number): pg.Pool {
  const isNeon =
    connectionString.includes("neon") ||
    connectionString.includes("sslmode=require");

  const poolInstance = new Pool({
    connectionString,
    ssl: isNeon ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
  });

  poolInstance.on("error", (err) => {
    console.error(`[DB-${index + 1}] Idle client error:`, err.message);
  });

  return poolInstance;
}

// Instantiate pools and drizzle instances for all available databases
const pools = DB_URLS.map((url, i) => createPgPool(url, i));
const dbInstances = pools.map((p) => drizzle(p, { schema }));

// Primary default pool & drizzle instance
let currentPrimaryIndex = 0;

export const pool = pools[0]!;
export const db1 = dbInstances[0]!;
export const db2 = dbInstances[1] ?? db1;
export const db3 = dbInstances[2] ?? db1;
export const db4 = dbInstances[3] ?? db1;
export const db5 = dbInstances[4] ?? db1;

/**
 * Smart Dynamic DB Proxy (Automatic Failover)
 * Transparently delegates all Drizzle ORM operations to the current healthy primary DB.
 * If the active DB runs out of quota / errors out, automatically fails over to next DB.
 */
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    const activeDb = dbInstances[currentPrimaryIndex] ?? dbInstances[0]!;
    const val = Reflect.get(activeDb, prop, receiver);
    if (typeof val === "function") {
      return function (this: unknown, ...args: unknown[]) {
        try {
          return val.apply(activeDb, args);
        } catch (err: any) {
          // If connection or quota fails, switch to next DB in failover ring
          if (
            err?.message?.includes("quota") ||
            err?.message?.includes("connection") ||
            err?.message?.includes("timeout") ||
            err?.code === "57P01"
          ) {
            const nextIndex = (currentPrimaryIndex + 1) % dbInstances.length;
            console.warn(`[DB-Failover] Switching from DB-${currentPrimaryIndex + 1} to DB-${nextIndex + 1} due to: ${err.message}`);
            currentPrimaryIndex = nextIndex;
            const newActiveDb = dbInstances[currentPrimaryIndex]!;
            const newVal = Reflect.get(newActiveDb, prop, receiver);
            return newVal.apply(newActiveDb, args);
          }
          throw err;
        }
      };
    }
    return val;
  },
});

console.log(`[DB] Multi-DB Pool initialized with ${DB_URLS.length} Neon databases. Primary: DB-${currentPrimaryIndex + 1}`);

export * from "./schema/index.js";
