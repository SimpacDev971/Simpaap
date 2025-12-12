// lib/cache.ts - Cache réutilisable côté serveur
import { LRUCache } from 'lru-cache';

// ────────────────────────────────────────────────
// 🎯 CACHE FACTORY - Créer des caches typés
// ────────────────────────────────────────────────
export function createCache<K extends {}, V extends {}>(options: {
  max: number;
  ttl: number;
  name?: string;
}) {
  return new LRUCache<K, V>({
    max: options.max,
    ttl: options.ttl,
    updateAgeOnGet: true,
    updateAgeOnHas: false,
  });
}

// ────────────────────────────────────────────────
// 📦 CACHES PRÉ-CONFIGURÉS
// ────────────────────────────────────────────────

// Cache des tenants
export const tenantCache = createCache<string, boolean>({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
  name: 'tenants',
});

// Cache des permissions utilisateur
export const permissionCache = createCache<string, string[]>({
  max: 1000,
  ttl: 1000 * 60 * 10, // 10 minutes
  name: 'permissions',
});

// Cache des données API
export const apiCache = createCache<string, any>({
  max: 200,
  ttl: 1000 * 60 * 2, // 2 minutes
  name: 'api',
});

// Cache des profils utilisateur
export const userProfileCache = createCache<string, any>({
  max: 500,
  ttl: 1000 * 60 * 15, // 15 minutes
  name: 'userProfiles',
});

// ────────────────────────────────────────────────
// 🛠️ HELPER FUNCTIONS
// ────────────────────────────────────────────────

/**
 * Wrapper générique pour cacher le résultat d'une fonction async
 */
export async function withCache<T extends {}>(
  cache: LRUCache<string, T>,
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  // Check cache
  const cached = cache.get(key);
  if (cached !== undefined) {
    console.log(`⚡ Cache hit: ${key}`);
    return cached;
  }

  // Fetch et cache
  console.log(`🔍 Cache miss: ${key}`);
  const result = await fetcher();
  cache.set(key, result);
  
  return result;
}

/**
 * Invalider un cache (utile après create/update/delete)
 */
export function invalidateCache(cache: LRUCache<any, any>, key: string) {
  cache.delete(key);
  console.log(`🗑️ Cache invalidated: ${key}`);
}

/**
 * Invalider plusieurs clés (pattern matching)
 */
export function invalidateCachePattern(
  cache: LRUCache<string, any>,
  pattern: string
) {
  const keys = Array.from(cache.keys());
  const toDelete = keys.filter(key => key.includes(pattern));
  
  toDelete.forEach(key => cache.delete(key));
  console.log(`🗑️ Invalidated ${toDelete.length} cache entries matching "${pattern}"`);
}

// ────────────────────────────────────────────────
// 📊 CACHE STATS (pour monitoring)
// ────────────────────────────────────────────────
export function getCacheStats(cache: LRUCache<any, any>) {
  return {
    size: cache.size,
    max: cache.max,
    calculatedSize: cache.calculatedSize,
  };
}