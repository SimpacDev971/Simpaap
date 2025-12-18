// Types pour le système de cache

export interface CachedCategory {
  id: number;
  nom: string;
  description: string | null;
}

export interface CachedApplication {
  id: number;
  nom: string;
  description: string | null;
  url: string | null;
  categorieid: number;
}

export interface CachedTenantApplications {
  categories: CachedCategory[];
  applications: CachedApplication[];
  // Applications groupées par catégorie pour un accès rapide
  byCategory: Record<number, CachedApplication[]>;
}

export interface TenantCacheEntry {
  subdomain: string;
  applications: CachedTenantApplications;
  lastUpdated: number;
}
