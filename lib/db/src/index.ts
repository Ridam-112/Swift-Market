import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

const { Pool } = pg;

const connectionString =
  process.env.MAIN_DB_URL ??
  process.env.DATABASE_URL ??
  process.env.DATABASE1_URL ??
  process.env.NEON_DATABASE_URL ??
  process.env.TEMP_DB_URL ??
  "postgresql://neondb_owner:npg_U38WKbfcFLwB@ep-lucky-shape-azpdcnzz-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

if (!process.env.DATABASE_URL && !process.env.MAIN_DB_URL) {
  console.log("[DB] Using default primary database (DB 2).");
}

const isNeon =
  connectionString.includes("neon") ||
  connectionString.includes("sslmode=require");

export const pool = new Pool({
  connectionString: connectionString || undefined,
  ssl: isNeon ? { rejectUnauthorized: false } : undefined,
  max: isNeon ? 5 : 10,
  idleTimeoutMillis: isNeon ? 20_000 : 30_000,
  connectionTimeoutMillis: 10_000,
  keepAlive: true,
});

pool.on("error", (err) => {
  console.error("[DB] Idle client error:", err.message);
});

export const db = drizzle(pool, { schema });

export * from "./schema/index.js";
