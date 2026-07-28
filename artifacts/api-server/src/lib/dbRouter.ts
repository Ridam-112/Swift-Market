/**
 * dbRouter.ts — SwiftMart Multi-Database Router
 *
 * Manages connections to all five Neon databases and provides helper
 * functions to resolve which shard holds a given user's or shop's data.
 *
 * Architecture:
 *   DB1 (DATABASE1_URL) — Main/Auth DB: users, admins, mapping tables, global config
 *   DB2 (DATABASE2_URL) — Shard: shops, products, orders, notifications, etc.
 *   DB3 (DATABASE3_URL) — Shard: same schema as DB2
 *   DB4 (DATABASE4_URL) — Shard: same schema as DB2
 *   DB5 (DATABASE5_URL) — Shard: same schema as DB2
 *
 * Phase 1 note: DB2–DB5 connections are created and validated at startup,
 * but no routes use them yet. The mapping tables in DB1 are empty until
 * Phase 3 (data migration) and Phase 4 (route migration).
 */

import { drizzle } from "drizzle-orm/node-postgres";
// @ts-ignore — @types/pg types the CJS entry; moduleResolution:bundler resolves ESM which has no .d.ts
import { Pool } from "pg";
import * as schema from "@workspace/db/schema";
import { usersMapping, shopsMapping } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { logger } from "./logger.js";

// ─── Connection factory ────────────────────────────────────────────────────────

function createNeonPool(url: string, label: string): Pool {
  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },   // all 5 DBs are Neon — always SSL
    max: 5,
    idleTimeoutMillis:     20_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
  });
  pool.on("error", (err: Error) => {
    logger.error({ label, msg: err.message }, `[dbRouter] idle client error on ${label}`);
  });
  return pool;
}

// ─── Database instances ────────────────────────────────────────────────────────

// DB1: main/auth database — uses the same pool as the default @workspace/db export
// We import `db` from @workspace/db for all DB1 mapping-table queries so we
// don't open a second connection pool to DATABASE1.
import { db as db1 } from "@workspace/db";
export { db1 };

// Fall back to DATABASE_URL when a shard-specific secret is not set (dev/single-DB mode).
const fallback = process.env.DATABASE_URL!;
const _db2Pool = createNeonPool(process.env.DATABASE2_URL ?? fallback, "DB2");
const _db3Pool = createNeonPool(process.env.DATABASE3_URL ?? fallback, "DB3");
const _db4Pool = createNeonPool(process.env.DATABASE4_URL ?? fallback, "DB4");
const _db5Pool = createNeonPool(process.env.DATABASE5_URL ?? fallback, "DB5");

export const db2 = drizzle(_db2Pool, { schema });
export const db3 = drizzle(_db3Pool, { schema });
export const db4 = drizzle(_db4Pool, { schema });
export const db5 = drizzle(_db5Pool, { schema });

type ShardNo = 2 | 3 | 4 | 5;
type ShardDb = typeof db2;

const SHARD_MAP: Record<ShardNo, ShardDb> = { 2: db2, 3: db3, 4: db4, 5: db5 };
const ALL_SHARDS: ShardDb[] = [db2, db3, db4, db5];
const SHARD_POOLS = [_db2Pool, _db3Pool, _db4Pool, _db5Pool];

// ─── In-memory routing cache ───────────────────────────────────────────────────
// Avoids a DB1 round-trip on every request after the first lookup.
// Simple FIFO eviction when the cache grows past MAX_SIZE.

const MAX_CACHE_SIZE = 10_000;

function cacheSet(cache: Map<string, ShardNo>, key: string, value: ShardNo): void {
  if (cache.size >= MAX_CACHE_SIZE) {
    // Evict the oldest (first-inserted) entry
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(key, value);
}

const _userDbCache  = new Map<string, ShardNo>();
const _shopDbCache  = new Map<string, ShardNo>();

// ─── Public helpers ────────────────────────────────────────────────────────────

/**
 * Returns the shard Drizzle instance (DB2–DB5) for a given userId.
 * Returns null if the user has no mapping yet (unmigrated or not yet assigned).
 */
export async function getUserDatabase(userId: string): Promise<ShardDb | null> {
  const cached = _userDbCache.get(userId);
  if (cached !== undefined) return SHARD_MAP[cached];

  const [row] = await db1
    .select({ databaseNo: usersMapping.databaseNo })
    .from(usersMapping)
    .where(eq(usersMapping.userId, userId))
    .limit(1);

  if (!row) return null;
  const no = row.databaseNo as ShardNo;
  cacheSet(_userDbCache, userId, no);
  return SHARD_MAP[no];
}

/**
 * Returns the shard Drizzle instance (DB2–DB5) for a given shopId.
 * Returns null if the shop has no mapping yet.
 */
export async function getShopDatabase(shopId: string): Promise<ShardDb | null> {
  const cached = _shopDbCache.get(shopId);
  if (cached !== undefined) return SHARD_MAP[cached];

  const [row] = await db1
    .select({ databaseNo: shopsMapping.databaseNo })
    .from(shopsMapping)
    .where(eq(shopsMapping.shopId, shopId))
    .limit(1);

  if (!row) return null;
  const no = row.databaseNo as ShardNo;
  cacheSet(_shopDbCache, shopId, no);
  return SHARD_MAP[no];
}

/**
 * Returns a specific shard Drizzle instance by database number.
 * Useful when you already know the shard number (e.g. from a mapping row).
 */
export function getDatabaseConnection(no: ShardNo): ShardDb {
  return SHARD_MAP[no];
}

/**
 * Returns all four shard databases [DB2, DB3, DB4, DB5].
 * Use for admin fan-out queries that must aggregate across all shards.
 */
export function getAllShardDatabases(): ShardDb[] {
  return ALL_SHARDS;
}

// ─── Round-robin assignment helpers ───────────────────────────────────────────
// Used by routes (Phase 4) when a new user or shop is first created.

/**
 * Assigns a new userId to the next shard in round-robin order and inserts
 * a row into users_mapping in DB1. Idempotent — safe to call more than once
 * for the same userId (onConflictDoNothing).
 * Returns the assigned database number.
 */
export async function assignUserDatabase(userId: string): Promise<ShardNo> {
  const [{ n }] = await db1.select({ n: count() }).from(usersMapping);
  const no = ((Number(n) % 4) + 2) as ShardNo;
  await db1.insert(usersMapping).values({ userId, databaseNo: no }).onConflictDoNothing();
  cacheSet(_userDbCache, userId, no);
  logger.info({ userId, databaseNo: no }, "[dbRouter] assigned user to shard");
  return no;
}

/**
 * Assigns a new shopId to the next shard in round-robin order and inserts
 * a row into shops_mapping in DB1. Idempotent — onConflictDoNothing.
 * Returns the assigned database number.
 */
export async function assignShopDatabase(shopId: string): Promise<ShardNo> {
  const [{ n }] = await db1.select({ n: count() }).from(shopsMapping);
  const no = ((Number(n) % 4) + 2) as ShardNo;
  await db1.insert(shopsMapping).values({ shopId, databaseNo: no }).onConflictDoNothing();
  cacheSet(_shopDbCache, shopId, no);
  logger.info({ shopId, databaseNo: no }, "[dbRouter] assigned shop to shard");
  return no;
}

// ─── Cache invalidation ────────────────────────────────────────────────────────

/** Remove a user's routing entry from the in-memory cache (e.g. on user deletion). */
export function invalidateUserCache(userId: string): void {
  _userDbCache.delete(userId);
}

/** Remove a shop's routing entry from the in-memory cache (e.g. on shop deletion). */
export function invalidateShopCache(shopId: string): void {
  _shopDbCache.delete(shopId);
}

// ─── Startup connectivity check ────────────────────────────────────────────────

/**
 * Verifies that all four shard databases accept connections.
 * Called once at server startup. Logs warnings for any shard that fails
 * (does NOT throw — the server can still serve requests from DB1).
 */
export async function verifyShardConnections(): Promise<void> {
  const checks = SHARD_POOLS.map(async (pool, i) => {
    const label = `DB${i + 2}`;
    try {
      const client = await pool.connect();
      await client.query("SELECT 1");
      client.release();
      logger.info({ label }, `[dbRouter] ${label} connection verified ✅`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn({ label, msg }, `[dbRouter] ${label} connection failed ⚠️`);
    }
  });
  await Promise.all(checks);
}
