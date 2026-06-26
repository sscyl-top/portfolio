type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();

const DEFAULT_TTL = 30_000;

export function getCachedData<T>(key: string, ttlMs = DEFAULT_TTL): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttlMs) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCachedData<T>(key: string, data: T): void {
  memoryCache.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(keyPrefix)) memoryCache.delete(key);
  }
}

export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = DEFAULT_TTL,
): Promise<T> {
  const cached = getCachedData<T>(key, ttlMs);
  if (cached !== null) return cached;
  const data = await fetcher();
  setCachedData(key, data);
  return data;
}
