// Cache pour les options d'impression par tenant
import { LRUCache } from 'lru-cache';

// ────────────────────────────────────────────────
// Types pour le cache des options d'impression
// ────────────────────────────────────────────────

export interface CachedPrintColor {
  id: number;
  value: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
}

export interface CachedPrintSide {
  id: number;
  value: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
}

export interface CachedPrintOptions {
  colors: CachedPrintColor[];
  sides: CachedPrintSide[];
}

// ────────────────────────────────────────────────
// 🚀 PRINT OPTIONS CACHE - Par tenant
// ────────────────────────────────────────────────

export const printOptionsCache = new LRUCache<string, CachedPrintOptions>({
  max: 100, // Maximum 100 tenants en cache
  ttl: 1000 * 60 * 10, // TTL = 10 minutes
  updateAgeOnGet: true,
  updateAgeOnHas: false,
});

// ────────────────────────────────────────────────
// 🛠️ HELPER FUNCTIONS
// ────────────────────────────────────────────────

/**
 * Récupère les options d'impression d'un tenant depuis le cache
 */
export function getPrintOptionsFromCache(subdomain: string): CachedPrintOptions | undefined {
  const cached = printOptionsCache.get(subdomain);
  if (cached) {
    console.log(`⚡ Print options cache hit for tenant: ${subdomain}`);
  }
  return cached;
}

/**
 * Met en cache les options d'impression d'un tenant
 */
export function setPrintOptionsCache(subdomain: string, data: CachedPrintOptions): void {
  printOptionsCache.set(subdomain, data);
  console.log(`✅ Cached print options for tenant: ${subdomain}`);
}

/**
 * Invalide le cache d'un tenant spécifique
 */
export function invalidatePrintOptionsCache(subdomain: string): void {
  printOptionsCache.delete(subdomain);
  console.log(`🗑️ Print options cache invalidated for tenant: ${subdomain}`);
}

/**
 * Invalide tout le cache des options d'impression
 */
export function invalidateAllPrintOptionsCache(): void {
  printOptionsCache.clear();
  console.log(`🗑️ All print options caches cleared`);
}

/**
 * Récupère les statistiques du cache
 */
export function getPrintOptionsCacheStats() {
  return {
    tenantsCached: printOptionsCache.size,
    maxTenants: printOptionsCache.max,
  };
}
