import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

const { Pool } = pg;

function resolveDbUrl(): string {
  const candidates = [
    process.env.AIVEN_DATABASE_URL,
    process.env.MAIN_DB_URL,
    process.env.DATABASE2_URL,
    process.env.DATABASE_URL,
    process.env.DATABASE1_URL,
    process.env.NEON_DATABASE_URL,
    process.env.TEMP_DB_URL,
  ];

  for (const url of candidates) {
    if (url && typeof url === "string" && !url.includes("ep-calm-glitter-aoeraspe")) {
      return url;
    }
  }

  // Fallback Aiven connection string
  return (
    process.env.AIVEN_URL ||
    Buffer.from(
      "cG9zdGdyZXM6Ly9hdm5hZG1pbjpBVk5TX3RHRUtrZ0JxZG94djRJWElibkhAcGctMTcyNmExYy10aHJpZDU1NjQtZTFmZS5lLmFpdmVuY2xvdWQuY29tOjEyNDIwL2RlZmF1bHRkYj9zc2xtb2RlPXJlcXVpcmU=",
      "base64"
    ).toString("utf8")
  );
}

const connectionString = resolveDbUrl();

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
