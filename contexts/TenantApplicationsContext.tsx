"use client";

import { CachedTenantApplications } from "@/lib/cache/types";
import { useSubdomain } from "@/hooks/useSubdomain";
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";

interface TenantApplicationsContextType {
  data: CachedTenantApplications | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  hasAccess: (applicationId: number) => boolean;
  getApplicationsByCategory: (categoryId: number) => CachedTenantApplications["applications"];
}

const TenantApplicationsContext = createContext<TenantApplicationsContextType | null>(null);

// Client-side cache
const clientCache = new Map<string, { data: CachedTenantApplications; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface TenantApplicationsProviderProps {
  children: ReactNode;
}

export function TenantApplicationsProvider({ children }: TenantApplicationsProviderProps) {
  const subdomain = useSubdomain();
  const [data, setData] = useState<CachedTenantApplications | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    if (!subdomain || subdomain === "default") {
      setIsLoading(false);
      setData(null);
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

  const hasAccess = useCallback(
    (applicationId: number): boolean => {
      if (!data) return false;
      return data.applications.some((app) => app.id === applicationId);
    },
    [data]
  );

  const getApplicationsByCategory = useCallback(
    (categoryId: number) => {
      return data?.byCategory[categoryId] || [];
    },
    [data]
  );

  return (
    <TenantApplicationsContext.Provider
      value={{
        data,
        isLoading,
        error,
        refetch: fetchApplications,
        hasAccess,
        getApplicationsByCategory,
      }}
    >
      {children}
    </TenantApplicationsContext.Provider>
  );
}

export function useTenantApplicationsContext(): TenantApplicationsContextType {
  const context = useContext(TenantApplicationsContext);
  if (!context) {
    throw new Error(
      "useTenantApplicationsContext must be used within TenantApplicationsProvider"
    );
  }
  return context;
}

/**
 * Invalider le cache client (à appeler après modifications)
 */
export function invalidateTenantClientCache(subdomain?: string) {
  if (subdomain) {
    clientCache.delete(subdomain);
  } else {
    clientCache.clear();
  }
}
