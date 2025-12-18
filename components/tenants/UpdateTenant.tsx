"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Application {
  id: number;
  nom: string;
  description: string | null;
  url: string | null;
  categorieid: number;
  categorie: {
    id: number;
    nom: string;
    description: string | null;
  };
}

interface UpdateTenantProps {
  tenantId: string;
  tenantName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function UpdateTenant({
  tenantId,
  tenantName,
  onSuccess,
  onCancel,
}: UpdateTenantProps) {
  const [allApplications, setAllApplications] = useState<Application[]>([]);
  const [selectedAppIds, setSelectedAppIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Fetch all applications and current tenant applications
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        // Fetch all available applications
        const appsRes = await fetch("/api/applications");
        if (!appsRes.ok) throw new Error("Erreur lors du chargement des applications");
        const apps: Application[] = await appsRes.json();
        setAllApplications(apps);

        // Fetch current tenant applications
        const tenantRes = await fetch(`/api/tenant/${tenantId}`);
        if (tenantRes.ok) {
          const tenantData = await tenantRes.json();
          const currentAppIds = new Set<number>(
            tenantData.tenant_application?.map((ta: { applicationid: number }) => ta.applicationid) || []
          );
          setSelectedAppIds(currentAppIds);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erreur lors du chargement";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tenantId]);

  const handleToggleApp = (appId: number) => {
    setSelectedAppIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(appId)) {
        newSet.delete(appId);
      } else {
        newSet.add(appId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedAppIds(new Set(allApplications.map((app) => app.id)));
  };

  const handleDeselectAll = () => {
    setSelectedAppIds(new Set());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/tenant/applications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          applicationIds: Array.from(selectedAppIds),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la mise à jour");
      }

      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inattendue";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  // Group applications by category
  const appsByCategory = allApplications.reduce<Record<string, Application[]>>((acc, app) => {
    const categoryName = app.categorie.nom;
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(app);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="bg-background rounded-lg p-6">
      <h2 className="text-xl font-bold mb-2 text-foreground">
        Gérer les applications
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Client : <span className="font-medium">{tenantName}</span>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2 mb-4">
          <Button type="button" variant="outline" size="sm" onClick={handleSelectAll}>
            Tout sélectionner
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleDeselectAll}>
            Tout désélectionner
          </Button>
        </div>

        <div className="max-h-80 overflow-y-auto space-y-4 border rounded-lg p-4">
          {Object.entries(appsByCategory).map(([categoryName, apps]) => (
            <div key={categoryName}>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2 uppercase tracking-wide">
                {categoryName}
              </h3>
              <div className="space-y-2">
                {apps.map((app) => (
                  <label
                    key={app.id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAppIds.has(app.id)}
                      onChange={() => handleToggleApp(app.id)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium">{app.nom}</span>
                      {app.description && (
                        <p className="text-xs text-muted-foreground">{app.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}

          {allApplications.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              Aucune application disponible
            </p>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          {selectedAppIds.size} application(s) sélectionnée(s)
        </p>

        {error && (
          <div className="bg-destructive/20 border border-destructive text-destructive px-4 py-3 rounded text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={saving} className="flex-1">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              "Enregistrer"
            )}
          </Button>
          {onCancel && (
            <Button type="button" onClick={onCancel} variant="outline">
              Annuler
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
