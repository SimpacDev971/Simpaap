"use client";

import PrintApp from "@/components/app/print/printApp";
import { useTenantApplicationsContext } from "@/contexts/TenantApplicationsContext";
import { CachedApplication } from "@/lib/cache/types";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";

// Registry of flux components - import your components here
// Example: import PrintApp from "@/components/app/print/printApp";
const fluxComponents: Record<string, React.ComponentType> = {
  // Add your flux components here:
  // "papier": PrintApp,
  // "numerique": NumeriqueApp,
  simpaap:PrintApp
};

/**
 * Convert application name to URL-safe slug
 */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, ""); // Trim hyphens
}

/**
 * Find application by slug from available applications
 */
function findAppBySlug(apps: CachedApplication[], slug: string): CachedApplication | undefined {
  return apps.find((app) => toSlug(app.nom) === slug);
}

export default function AppSelector() {
  const { data: tenantApps, isLoading } = useTenantApplicationsContext();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentFlux = searchParams.get("flux");
  const availableApps = tenantApps?.applications ?? [];

  // Update URL with flux parameter
  const setFlux = useCallback(
    (appSlug: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("flux", appSlug);
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // Auto-select first available app if none selected
  useEffect(() => {
    if (!isLoading && availableApps.length > 0 && !currentFlux) {
      const firstAppSlug = toSlug(availableApps[0].nom);
      setFlux(firstAppSlug);
    }
  }, [isLoading, availableApps, currentFlux, setFlux]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Chargement des applications...</span>
      </div>
    );
  }

  if (availableApps.length === 0) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center">
        <p className="text-yellow-800">
          Aucune application disponible pour votre organisation.
        </p>
        <p className="mt-1 text-sm text-yellow-600">
          Contactez votre administrateur pour activer des applications.
        </p>
      </div>
    );
  }

  const selectedApp = currentFlux ? findAppBySlug(availableApps, currentFlux) : null;
  const FluxComponent = currentFlux ? fluxComponents[currentFlux] : null;

  return (
    <>
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {availableApps.map((app) => {
          const appSlug = toSlug(app.nom);
          const isSelected = currentFlux === appSlug;

          return (
            <button
              key={app.id}
              onClick={() => setFlux(appSlug)}
              className={`flex items-center space-x-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                isSelected
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700"
              }`}
            >
              <div
                className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                  isSelected
                    ? "border-emerald-600 bg-emerald-600"
                    : "border-slate-300 dark:border-slate-600"
                }`}
              >
                {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
              <span>{app.nom}</span>
            </button>
          );
        })}
      </div>

      {selectedApp && (
        <div className="mt-6">
          {FluxComponent ? (
            <FluxComponent />
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800">
              <p className="text-slate-600 dark:text-slate-400">
                Application &quot;{selectedApp.nom}&quot; - Composant non configuré
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Ajoutez le composant dans fluxComponents avec la clé &quot;{currentFlux}&quot;
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
