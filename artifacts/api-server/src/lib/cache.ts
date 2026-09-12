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

import * as IORedis from "ioredis";
import { logger } from "./logger.js";

const RedisClass: any = (IORedis as any).default || (IORedis as any).Redis || IORedis;

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

// ── In-Memory L1 Cache (Always active, 0 DB transfer) ─────────────────────────
interface MemoryCacheEntry {
  value: unknown;
  expiresAt: number;
}
const memoryCache = new Map<string, MemoryCacheEntry>();
const MAX_MEMORY_CACHE_ITEMS = 500;

// Periodic cleanup of expired in-memory cache items
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of memoryCache) {
    if (v.expiresAt <= now) memoryCache.delete(k);
  }
}, 60_000);

// ── Internal state ────────────────────────────────────────────────────────────
let redis: any = null;
let available = false;

// ─── Public helpers ────────────────────────────────────────────────────────────

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
 * Get a cached value. Checks In-Memory cache first, then Redis.
 */
export async function cacheGet<T = unknown>(key: string): Promise<T | null> {
  const now = Date.now();
  // 1. Check L1 Memory cache
  const mem = memoryCache.get(key);
  if (mem) {
    if (mem.expiresAt > now) {
      return mem.value as T;
    }
    memoryCache.delete(key);
  }

  // 2. Check L2 Redis cache if available
  if (redis && available) {
    try {
      const raw = await redis.get(key);
      if (raw) {
        const parsed = JSON.parse(raw) as T;
        // Populate L1 cache
        memoryCache.set(key, { value: parsed, expiresAt: now + 60_000 });
        return parsed;
      }
    } catch {
      // Non-fatal
    }
  }

  return null;
}

/**
 * Store a value in memory cache and Redis.
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const now = Date.now();
  // Evict oldest if full
  if (memoryCache.size >= MAX_MEMORY_CACHE_ITEMS) {
    const first = memoryCache.keys().next().value;
    if (first !== undefined) memoryCache.delete(first);
  }
  memoryCache.set(key, { value, expiresAt: now + ttlSeconds * 1000 });

  if (redis && available) {
    try {
      await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch {
      // Non-fatal
    }
  }
}

/**
 * Delete one or more exact keys from memory and Redis.
 */
export async function cacheDel(...keys: string[]): Promise<void> {
  for (const k of keys) {
    memoryCache.delete(k);
  }

  if (redis && available && keys.length > 0) {
    try {
      await redis.del(...keys);
    } catch {
      // Non-fatal
    }
  }
}

/**
 * Delete all keys matching a pattern from memory and Redis.
 */
export async function cacheDelPattern(pattern: string): Promise<void> {
  // Convert glob pattern (e.g. sm:products:*) to regex
  const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
  for (const k of memoryCache.keys()) {
    if (regex.test(k)) {
      memoryCache.delete(k);
    }
  }

  if (redis && available) {
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

  redis = new RedisClass(url, {
    // Don't queue commands while disconnected — fail fast so callers fall
    // through to PostgreSQL immediately rather than waiting for reconnect.
    enableOfflineQueue: false,
    // Retry each command at most once before giving up (keeps latency bounded).
    maxRetriesPerRequest: 1,
    // Give up on the initial TCP handshake after 5 s.
    connectTimeout: 5_000,
    // ioredis built-in reconnect: exponential backoff capped at 30 s.
    retryStrategy: (times: number) => Math.min(times * 500, 30_000),
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
