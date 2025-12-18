// Cache pour les applications par tenant
import { LRUCache } from 'lru-cache';
import { CachedTenantApplications } from './types';

// ────────────────────────────────────────────────
// 🚀 APPLICATION CACHE - Par tenant
// ────────────────────────────────────────────────
export const applicationCache = new LRUCache<string, CachedTenantApplications>({
  max: 100, // Maximum 100 tenants en cache
  ttl: 1000 * 60 * 10, // TTL = 10 minutes
  updateAgeOnGet: true,
  updateAgeOnHas: false,
});

// Cache global pour toutes les catégories (partagé entre tenants)
export const categoriesCache = new LRUCache<string, { id: number; nom: string; description: string | null }[]>({
  max: 1,
  ttl: 1000 * 60 * 30, // 30 minutes - les catégories changent rarement
  updateAgeOnGet: true,
});

// ────────────────────────────────────────────────
// 🛠️ HELPER FUNCTIONS
// ────────────────────────────────────────────────

/**
 * Récupère les applications d'un tenant depuis le cache
 */
export function getTenantApplicationsFromCache(subdomain: string): CachedTenantApplications | undefined {
  const cached = applicationCache.get(subdomain);
  if (cached) {
    console.log(`⚡ Application cache hit for tenant: ${subdomain}`);
  }
  return cached;
}

/**
 * Met en cache les applications d'un tenant
 */
export function setTenantApplicationsCache(subdomain: string, data: CachedTenantApplications): void {
  applicationCache.set(subdomain, data);
  console.log(`✅ Cached ${data.applications.length} applications for tenant: ${subdomain}`);
}

/**
 * Invalide le cache d'un tenant spécifique
 */
export function invalidateTenantApplicationsCache(subdomain: string): void {
  applicationCache.delete(subdomain);
  console.log(`🗑️ Application cache invalidated for tenant: ${subdomain}`);
}

/**
 * Invalide tout le cache applications
 */
export function invalidateAllApplicationsCache(): void {
  applicationCache.clear();
  categoriesCache.clear();
  console.log(`🗑️ All application caches cleared`);
}

/**
 * Récupère les statistiques du cache
 */
export function getApplicationCacheStats() {
  return {
    tenantsCached: applicationCache.size,
    maxTenants: applicationCache.max,
    categoriesCached: categoriesCache.size,
  };
}
