import { drizzle } from "drizzle-orm/node-postgres";
import { withReplicas } from "drizzle-orm/pg-core";
import pg from "pg";
import * as schema from "./schema/index.js";

const { Pool } = pg;

// ── 5 Neon Database Connection Strings ─────────────────────────────────────────
// Connections are configured strictly via environment variables (DATABASE_URL / DATABASE1_URL ... DATABASE5_URL)
export const DB_URLS = [
  process.env.DATABASE_URL || process.env.DATABASE1_URL,
  process.env.DATABASE2_URL,
  process.env.DATABASE3_URL,
  process.env.DATABASE4_URL,
  process.env.DATABASE5_URL,
].filter((url): url is string => Boolean(url && url.trim().length > 0));

function toNeonPoolerUrl(url: string): string {
  // Use connection string as provided by user/environment directly.
  // Never rewrite the domain to prevent DNS ENOTFOUND host errors.
  return url;
}

function createPgPool(rawConnectionString: string, index: number): pg.Pool {
  const connectionString = toNeonPoolerUrl(rawConnectionString);
  const isNeon =
    connectionString.includes("neon") ||
    connectionString.includes("sslmode=require");

  const poolInstance = new Pool({
    connectionString,
    ssl: isNeon ? { rejectUnauthorized: false } : undefined,
    max: 3, // Conservative pool per DB to stay well within Neon free tier connection limits
    idleTimeoutMillis: 5_000, // 5s idle timeout: lets Neon scale-to-zero immediately when traffic pauses!
    connectionTimeoutMillis: 8_000,
    keepAlive: false, // Do NOT send TCP keepalives — allows Neon compute auto-suspend
    allowExitOnIdle: true, // Allow node process to release sockets without lingering
  });

  poolInstance.on("error", (err) => {
    console.error(`[DB-${index + 1}] Idle client error:`, err.message);
  });

  return poolInstance;
}

// ── Multi-Pool Initialization ─────────────────────────────────────────────────
const pools = DB_URLS.map((url, i) => createPgPool(url, i));
const dbInstances = pools.map((p) => drizzle(p, { schema }));

export const pool = pools[0]!;
export const primaryDb = dbInstances[0]!;
export const replicaDbs = dbInstances.slice(1);

// ── Smart Read Load Balancer across all Replicas ──────────────────────────────
let readCounter = 0;
function getHealthyReplica(replicas: typeof dbInstances) {
  if (!replicas || replicas.length === 0) return primaryDb;
  const idx = readCounter++ % replicas.length;
  return replicas[idx]!;
}

// Always use primaryDb as the single source of truth for full data consistency.
export const db = primaryDb;

console.log(`[DB] Database connection active using primary master pool.`);

export * from "./schema/index.js";
