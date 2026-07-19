/**
 * cache.ts — Redis-backed cache layer for SwiftMart API.
 *
 * All operations are fully non-throwing:
 *   - If REDIS_URL is not set, caching is silently disabled.
 *   - If Redis becomes unavailable at runtime, the app falls through to
 *     PostgreSQL on every request (no errors surfaced to callers).
 *
 * Usage:
 *   import { cacheGet, cacheSet, cacheDel, cacheDelPattern, TTL, KEYS, productsCacheKey } from "../lib/cache.js";
 */

import Redis from "ioredis";
import { logger } from "./logger.js";

// ── TTL constants (seconds) ───────────────────────────────────────────────────
export const TTL = {
  PRODUCTS:   5  * 60, // 5 minutes
  CATEGORIES: 30 * 60, // 30 minutes
  HOMEPAGE:   5  * 60, // 5 minutes
} as const;

// ── Cache key constants ───────────────────────────────────────────────────────
export const KEYS = {
  CATEGORIES:      "sm:categories",
  HOMEPAGE:        "sm:homepage",
  PRODUCTS_PREFIX: "sm:products:",
} as const;

// ── Internal state ────────────────────────────────────────────────────────────
let redis: Redis | null = null;
let available = false;

// ── Public helpers ────────────────────────────────────────────────────────────

/**
 * Build a deterministic cache key for the products list endpoint.
 * Sorts query-param keys so `?category=fruit&page=1` and `?page=1&category=fruit`
 * produce the same key.
 */
export function productsCacheKey(query: Record<string, string>): string {
  const sorted = Object.keys(query)
    .sort()
    .reduce<Record<string, string>>((acc, k) => {
      acc[k] = query[k] as string;
      return acc;
    }, {});
  return KEYS.PRODUCTS_PREFIX + JSON.stringify(sorted);
}

/**
 * Get a cached value. Returns `null` on miss, Redis unavailability, or any error.
 */
export async function cacheGet<T = unknown>(key: string): Promise<T | null> {
  if (!redis || !available) return null;
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Store a value. Silently no-ops if Redis is unavailable or an error occurs.
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!redis || !available) return;
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Non-fatal
  }
}

/**
 * Delete one or more exact keys.
 */
export async function cacheDel(...keys: string[]): Promise<void> {
  if (!redis || !available || keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch {
    // Non-fatal
  }
}

/**
 * Delete all keys matching a glob pattern (uses SCAN — safe for production).
 * Example pattern: "sm:products:*"
 */
export async function cacheDelPattern(pattern: string): Promise<void> {
  if (!redis || !available) return;
  try {
    let cursor = "0";
    do {
      const [next, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 200);
      cursor = next;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
  } catch {
    // Non-fatal
  }
}

/**
 * Invalidate all product-list cache entries and the homepage cache.
 * Call this after any product create / update / delete.
 */
export async function invalidateProductCaches(): Promise<void> {
  await Promise.all([
    cacheDelPattern(KEYS.PRODUCTS_PREFIX + "*"),
    cacheDel(KEYS.HOMEPAGE),
  ]);
}

/**
 * Invalidate the categories cache.
 * Call this after any category create / update / delete.
 */
export async function invalidateCategoryCache(): Promise<void> {
  await cacheDel(KEYS.CATEGORIES);
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

/**
 * Connect to Redis. Call once at server startup.
 * If REDIS_URL is absent or the connection fails, caching is disabled and
 * the rest of the application continues normally.
 */
export function connectRedis(): void {
  const url = process.env["REDIS_URL"];
  if (!url) {
    logger.warn("REDIS_URL not set — Redis caching disabled");
    return;
  }

  redis = new Redis(url, {
    // Don't queue commands while disconnected — fail fast so callers fall
    // through to PostgreSQL immediately rather than waiting for reconnect.
    enableOfflineQueue: false,
    // Retry each command at most once before giving up (keeps latency bounded).
    maxRetriesPerRequest: 1,
    // Give up on the initial TCP handshake after 5 s.
    connectTimeout: 5_000,
    // ioredis built-in reconnect: exponential backoff capped at 30 s.
    retryStrategy: (times) => Math.min(times * 500, 30_000),
  });

  redis.on("connect", () => {
    available = true;
    logger.info("Redis connected — response caching enabled");
  });

  redis.on("ready", () => {
    available = true;
  });

  redis.on("error", (err: Error) => {
    if (available) {
      logger.warn({ err: err.message }, "Redis error — falling back to PostgreSQL-only");
    }
    available = false;
  });

  redis.on("close", () => {
    available = false;
  });

  redis.on("reconnecting", () => {
    logger.info("Redis reconnecting…");
  });
}

/**
 * Gracefully close the Redis connection. Call from your SIGTERM handler.
 */
export async function disconnectRedis(): Promise<void> {
  if (!redis) return;
  try {
    await redis.quit();
  } catch {
    redis.disconnect();
  }
  redis = null;
  available = false;
}
