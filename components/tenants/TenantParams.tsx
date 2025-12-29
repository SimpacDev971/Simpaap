"use client";

import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Application {
  id: number;
  nom: string;
  description?: string;
}

interface PrintOption {
  id: number;
  value: string;
  label: string;
  isActive: boolean;
}

interface Enveloppe {
  id: number;
  fullName: string;
  taille: string;
  isActive: boolean;
}

interface Speed {
  id: number;
  value: string;
  label: string;
  isActive: boolean;
}

interface TenantParamsProps {
  tenantId: string;
  tenantName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

type PrintOptionType = "colors" | "sides" | "enveloppes" | "speeds";

const PRINT_OPTIONS: { id: PrintOptionType; label: string }[] = [
  { id: "colors", label: "Couleurs" },
  { id: "sides", label: "Côtés" },
  { id: "enveloppes", label: "Enveloppes" },
  { id: "speeds", label: "Vitesses" },
];

export default function TenantParams({
  tenantId,
  tenantName,
  onSuccess,
  onCancel,
}: TenantParamsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Simpaap expansion state
  const [simpaapExpanded, setSimpaapExpanded] = useState(false);
  const [activePrintOption, setActivePrintOption] = useState<PrintOptionType>("colors");

  // All available options (global)
  const [allApplications, setAllApplications] = useState<Application[]>([]);
  const [allColors, setAllColors] = useState<PrintOption[]>([]);
  const [allSides, setAllSides] = useState<PrintOption[]>([]);
  const [allEnveloppes, setAllEnveloppes] = useState<Enveloppe[]>([]);
  const [allSpeeds, setAllSpeeds] = useState<Speed[]>([]);

  // Assigned to tenant
  const [assignedAppIds, setAssignedAppIds] = useState<Set<number>>(new Set());
  const [assignedColorIds, setAssignedColorIds] = useState<Set<number>>(new Set());
  const [assignedSideIds, setAssignedSideIds] = useState<Set<number>>(new Set());
  const [assignedEnveloppeIds, setAssignedEnveloppeIds] = useState<Set<number>>(new Set());
  const [assignedSpeedIds, setAssignedSpeedIds] = useState<Set<number>>(new Set());

  // Track changes
  const [hasChanges, setHasChanges] = useState(false);

  // Check if Simpaap is assigned
  const simpaapApp = allApplications.find(
    (app) => app.nom.toLowerCase() === "simpaap"
  );
  const isSimpaapAssigned = simpaapApp ? assignedAppIds.has(simpaapApp.id) : false;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        const [
          appsRes,
          tenantRes,
          colorsRes,
          sidesRes,
          enveloppesRes,
          speedsRes,
          tenantPrintOptionsRes,
        ] = await Promise.all([
          fetch("/api/applications"),
          fetch(`/api/tenant/${tenantId}`),
          fetch("/api/print-options/colors"),
          fetch("/api/print-options/sides"),
          fetch("/api/print-options/enveloppes"),
          fetch("/api/print-options/speeds"),
          fetch(`/api/tenant/${tenantId}/print-options`),
        ]);

        if (!appsRes.ok || !tenantRes.ok) {
          throw new Error("Erreur lors du chargement");
        }

        const apps = await appsRes.json();
        const tenant = await tenantRes.json();
        const colors = colorsRes.ok ? await colorsRes.json() : [];
        const sides = sidesRes.ok ? await sidesRes.json() : [];
        const enveloppes = enveloppesRes.ok ? await enveloppesRes.json() : [];
        const speeds = speedsRes.ok ? await speedsRes.json() : [];
        const tenantPrintOptions = tenantPrintOptionsRes.ok ? await tenantPrintOptionsRes.json() : {};

        setAllApplications(apps);
        setAllColors(colors.filter((c: PrintOption) => c.isActive));
        setAllSides(sides.filter((s: PrintOption) => s.isActive));
        setAllEnveloppes(enveloppes.filter((e: Enveloppe) => e.isActive));
        setAllSpeeds(speeds.filter((s: Speed) => s.isActive));

        const tenantAppIds = tenant.tenant_application?.map((ta: { applicationid: number }) => ta.applicationid) || [];
        setAssignedAppIds(new Set(tenantAppIds));

        setAssignedColorIds(new Set(tenantPrintOptions.colors?.map((c: PrintOption) => c.id) || []));
        setAssignedSideIds(new Set(tenantPrintOptions.sides?.map((s: PrintOption) => s.id) || []));
        setAssignedEnveloppeIds(new Set(tenantPrintOptions.enveloppes?.map((e: Enveloppe) => e.id) || []));
        setAssignedSpeedIds(new Set(tenantPrintOptions.speeds?.map((s: Speed) => s.id) || []));

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erreur inconnue";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tenantId]);

  const toggleApp = (id: number) => {
    setHasChanges(true);
    setAssignedAppIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
        // If Simpaap is being unchecked, collapse the section
        if (simpaapApp && id === simpaapApp.id) {
          setSimpaapExpanded(false);
        }
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const togglePrintOption = (type: PrintOptionType, id: number) => {
    setHasChanges(true);

    switch (type) {
      case "colors":
        setAssignedColorIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) newSet.delete(id);
          else newSet.add(id);
          return newSet;
        });
        break;
      case "sides":
        setAssignedSideIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) newSet.delete(id);
          else newSet.add(id);
          return newSet;
        });
        break;
      case "enveloppes":
        setAssignedEnveloppeIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) newSet.delete(id);
          else newSet.add(id);
          return newSet;
        });
        break;
      case "speeds":
        setAssignedSpeedIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) newSet.delete(id);
          else newSet.add(id);
          return newSet;
        });
        break;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      const appsRes = await fetch(`/api/tenant/applications`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          applicationIds: Array.from(assignedAppIds),
        }),
      });

      if (!appsRes.ok) {
        throw new Error("Erreur lors de la mise à jour des applications");
      }

      const printRes = await fetch(`/api/tenant/${tenantId}/print-options`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colorIds: Array.from(assignedColorIds),
          sideIds: Array.from(assignedSideIds),
          enveloppeIds: Array.from(assignedEnveloppeIds),
          speedIds: Array.from(assignedSpeedIds),
        }),
      });

      if (!printRes.ok) {
        throw new Error("Erreur lors de la mise à jour des options d'impression");
      }

      setHasChanges(false);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la sauvegarde";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const getPrintOptionItems = (type: PrintOptionType): { items: { id: number; label: string; description?: string }[]; assignedIds: Set<number> } => {
    switch (type) {
      case "colors":
        return { items: allColors.map(c => ({ id: c.id, label: c.label })), assignedIds: assignedColorIds };
      case "sides":
        return { items: allSides.map(s => ({ id: s.id, label: s.label })), assignedIds: assignedSideIds };
      case "enveloppes":
        return { items: allEnveloppes.map(e => ({ id: e.id, label: e.fullName, description: e.taille })), assignedIds: assignedEnveloppeIds };
      case "speeds":
        return { items: allSpeeds.map(s => ({ id: s.id, label: s.label })), assignedIds: assignedSpeedIds };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Configurez les options disponibles pour <strong>{tenantName}</strong>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-auto">
        {/* Applications List */}
        {allApplications.map(app => {
          const isSimpaap = app.nom.toLowerCase() === "simpaap";
          const isAssigned = assignedAppIds.has(app.id);

          return (
            <div key={app.id} className="border rounded-lg overflow-hidden">
              {/* Application Row */}
              <div
                className={`flex items-center gap-3 p-3 ${
                  isSimpaap && isAssigned ? "cursor-pointer hover:bg-muted/50" : ""
                }`}
                onClick={() => {
                  if (isSimpaap && isAssigned) {
                    setSimpaapExpanded(!simpaapExpanded);
                  }
                }}
              >
                {/* Expand/Collapse icon for Simpaap */}
                {isSimpaap && isAssigned ? (
                  <span className="text-muted-foreground">
                    {simpaapExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </span>
                ) : (
                  <span className="w-4" />
                )}

                <label className="flex items-center gap-3 flex-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAssigned}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleApp(app.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{app.nom}</div>
                    {app.description && (
                      <div className="text-sm text-muted-foreground">{app.description}</div>
                    )}
                  </div>
                </label>

                {isSimpaap && isAssigned && (
                  <span className="text-xs text-muted-foreground">
                    Cliquez pour configurer
                  </span>
                )}
              </div>

              {/* Simpaap Print Options - Nested */}
              {isSimpaap && isAssigned && simpaapExpanded && (
                <div className="border-t bg-muted/30">
                  <div className="p-3 border-b bg-muted/50">
                    <div className="text-sm font-medium text-muted-foreground">
                      Options d&apos;impression Simpaap
                    </div>
                  </div>

                  <div className="flex min-h-[300px]">
                    {/* Left: Print Option Categories */}
                    <div className="w-40 border-r bg-background p-2 space-y-1">
                      {PRINT_OPTIONS.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setActivePrintOption(opt.id)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                            activePrintOption === opt.id
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {/* Right: Checkboxes */}
                    <div className="flex-1 p-3 overflow-auto max-h-[300px]">
                      {(() => {
                        const { items, assignedIds } = getPrintOptionItems(activePrintOption);

                        if (items.length === 0) {
                          return (
                            <div className="text-center py-8 text-muted-foreground">
                              Aucune option disponible
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-2">
                            {items.map(item => (
                              <label
                                key={item.id}
                                className="flex items-start gap-3 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={assignedIds.has(item.id)}
                                  onChange={() => togglePrintOption(activePrintOption, item.id)}
                                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{item.label}</div>
                                  {item.description && (
                                    <div className="text-xs text-muted-foreground">{item.description}</div>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="bg-destructive/20 border border-destructive text-destructive px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button onClick={handleSave} disabled={saving || !hasChanges}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            "Enregistrer"
          )}
        </Button>
      </div>
    </div>
  );
}
