/**
 * Simple in-memory server-side cache with TTL.
 * Lives as long as the serverless function instance stays warm.
 * Reduces repeated full-table scans for the same filter set.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// Module-level map — shared across requests in the same warm instance
const store = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCached<T>(key: string, data: T, ttlMs = 5 * 60 * 1000): void {
  // Evict old entries when cache grows large
  if (store.size > 200) {
    const now = Date.now();
    for (const [k, v] of store.entries()) {
      if (now > v.expiresAt) store.delete(k);
    }
  }
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function makeCacheKey(...parts: unknown[]): string {
  return JSON.stringify(parts);
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
