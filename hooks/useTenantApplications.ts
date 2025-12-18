"use client";

import { CachedTenantApplications } from "@/lib/cache/types";
import { useCallback, useEffect, useState } from "react";
import { useSubdomain } from "./useSubdomain";

interface UseTenantApplicationsReturn {
  data: CachedTenantApplications | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Client-side cache pour éviter les refetch inutiles
const clientCache = new Map<string, { data: CachedTenantApplications; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useTenantApplications(): UseTenantApplicationsReturn {
  const subdomain = useSubdomain();
  const [data, setData] = useState<CachedTenantApplications | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    if (!subdomain || subdomain === "default") {
      setIsLoading(false);
      return;
    }

    // Check client-side cache
    const cached = clientCache.get(subdomain);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setData(cached.data);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tenant/applications?subdomain=${subdomain}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch applications: ${response.statusText}`);
      }

      const result: CachedTenantApplications = await response.json();

      // Update client-side cache
      clientCache.set(subdomain, { data: result, timestamp: Date.now() });

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching tenant applications:", err);
    } finally {
      setIsLoading(false);
    }
  }, [subdomain]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchApplications,
  };
}

/**
 * Hook pour vérifier si un tenant a accès à une application spécifique
 */
export function useHasApplicationAccess(applicationId: number): boolean {
  const { data } = useTenantApplications();

  if (!data) return false;

  return data.applications.some((app) => app.id === applicationId);
}

/**
 * Hook pour obtenir les applications d'une catégorie spécifique
 */
export function useCategoryApplications(categoryId: number) {
  const { data, isLoading, error } = useTenantApplications();

  return {
    applications: data?.byCategory[categoryId] || [],
    isLoading,
    error,
  };
}

/**
 * Invalider le cache client (à appeler après modifications)
 */
export function invalidateClientCache(subdomain?: string) {
  if (subdomain) {
    clientCache.delete(subdomain);
  } else {
    clientCache.clear();
  }
}
