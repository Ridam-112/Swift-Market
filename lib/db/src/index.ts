import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

const { Pool } = pg;

function resolveDbUrl(): string {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.AIVEN_DATABASE_URL,
    process.env.MAIN_DB_URL,
    process.env.DATABASE2_URL,
    process.env.DATABASE1_URL,
    process.env.NEON_DATABASE_URL,
    process.env.TEMP_DB_URL,
    process.env.AIVEN_URL,
  ];

  for (const url of candidates) {
    if (url && typeof url === "string" && url.trim().length > 0) {
      return url.trim();
    }
  }

  return "";
}

const connectionString = resolveDbUrl();

if (!connectionString) {
  console.warn("[DB] ⚠️ DATABASE_URL environment variable is not set. Ensure DATABASE_URL is provided in production.");
}

console.log("[DB] Connected to primary database:", connectionString.split("@")[1]?.split("/")[0] ?? "Neon DB");

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
