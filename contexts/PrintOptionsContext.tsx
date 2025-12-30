"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";

// --- Types ---
export interface PrintColor {
  id: number;
  value: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
}

export interface PrintSide {
  id: number;
  value: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
}

export interface Enveloppe {
  id: number;
  fullName: string;
  taille: string;
  pdsMax: number;
  addrX: number;
  addrY: number;
  addrH: number;
  addrL: number;
  isActive: boolean;
}

export interface Speed {
  id: number;
  value: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
}

export interface CachedPrintOptions {
  colors: PrintColor[];
  sides: PrintSide[];
  enveloppes: Enveloppe[];
  speeds: Speed[];
}

interface PrintOptionsContextType {
  data: CachedPrintOptions | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  invalidateCache: () => void;
}

const PrintOptionsContext = createContext<PrintOptionsContextType | null>(null);

// --- Cache Configuration ---
// Cache TTL: 12 hours (reload 2 times a day)
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
const CACHE_KEY = 'print_options_cache';

interface CacheEntry {
  data: CachedPrintOptions;
  timestamp: number;
}

// LocalStorage cache helpers
function getCachedData(): CacheEntry | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const entry: CacheEntry = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is expired (older than 12 hours)
    if (now - entry.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return entry;
  } catch {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

function setCachedData(data: CachedPrintOptions): void {
  if (typeof window === 'undefined') return;

  try {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch (error) {
    console.error('Failed to cache print options:', error);
  }
}

function clearCache(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CACHE_KEY);
}

// --- Provider ---
interface PrintOptionsProviderProps {
  children: ReactNode;
}

export function PrintOptionsProvider({ children }: PrintOptionsProviderProps) {
  const [data, setData] = useState<CachedPrintOptions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrintOptions = useCallback(async (forceRefresh = false) => {
    // Check localStorage cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getCachedData();
      if (cached) {
        setData(cached.data);
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/print-options/tenant');

      if (!response.ok) {
        throw new Error(`Failed to fetch print options: ${response.statusText}`);
      }

      const result: CachedPrintOptions = await response.json();

      // Cache the result
      setCachedData(result);

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching print options:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchPrintOptions();
  }, [fetchPrintOptions]);

  const invalidateCache = useCallback(() => {
    clearCache();
    fetchPrintOptions(true);
  }, [fetchPrintOptions]);

  return (
    <PrintOptionsContext.Provider
      value={{
        data,
        isLoading,
        error,
        refetch: () => fetchPrintOptions(true),
        invalidateCache,
      }}
    >
      {children}
    </PrintOptionsContext.Provider>
  );
}

export function usePrintOptionsContext(): PrintOptionsContextType {
  const context = useContext(PrintOptionsContext);
  if (!context) {
    throw new Error(
      "usePrintOptionsContext must be used within PrintOptionsProvider"
    );
  }
  return context;
}

/**
 * Invalidate the client-side print options cache
 * Call this after CRUD operations on print options (from admin UI)
 */
export function invalidatePrintOptionsClientCache() {
  clearCache();
}
