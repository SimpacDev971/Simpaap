"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
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
  description?: string;
  isActive: boolean;
}

interface TenantParamsProps {
  tenantId: string;
  tenantName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

type CategoryType = "applications" | "colors" | "sides" | "envelopes" | "postageTypes" | "postageSpeeds";

const CATEGORIES: { id: CategoryType; label: string }[] = [
  { id: "applications", label: "Applications" },
  { id: "colors", label: "Couleurs" },
  { id: "sides", label: "Côtés" },
  { id: "envelopes", label: "Enveloppes" },
  { id: "postageTypes", label: "Types d'affranchissement" },
  { id: "postageSpeeds", label: "Vitesses d'envoi" },
];

export default function TenantParams({
  tenantId,
  tenantName,
  onSuccess,
  onCancel,
}: TenantParamsProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryType>("applications");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // All available options (global)
  const [allApplications, setAllApplications] = useState<Application[]>([]);
  const [allColors, setAllColors] = useState<PrintOption[]>([]);
  const [allSides, setAllSides] = useState<PrintOption[]>([]);
  const [allEnvelopes, setAllEnvelopes] = useState<PrintOption[]>([]);
  const [allPostageTypes, setAllPostageTypes] = useState<PrintOption[]>([]);
  const [allPostageSpeeds, setAllPostageSpeeds] = useState<PrintOption[]>([]);

  // Assigned to tenant
  const [assignedAppIds, setAssignedAppIds] = useState<Set<number>>(new Set());
  const [assignedColorIds, setAssignedColorIds] = useState<Set<number>>(new Set());
  const [assignedSideIds, setAssignedSideIds] = useState<Set<number>>(new Set());
  const [assignedEnvelopeIds, setAssignedEnvelopeIds] = useState<Set<number>>(new Set());
  const [assignedPostageTypeIds, setAssignedPostageTypeIds] = useState<Set<number>>(new Set());
  const [assignedPostageSpeedIds, setAssignedPostageSpeedIds] = useState<Set<number>>(new Set());

  // Track changes
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        // Fetch all global options and tenant assignments in parallel
        const [
          appsRes,
          tenantRes,
          colorsRes,
          sidesRes,
          envelopesRes,
          postageTypesRes,
          postageSpeedsRes,
          tenantPrintOptionsRes,
        ] = await Promise.all([
          fetch("/api/applications"),
          fetch(`/api/tenant/${tenantId}`),
          fetch("/api/print-options/colors"),
          fetch("/api/print-options/sides"),
          fetch("/api/print-options/envelopes"),
          fetch("/api/print-options/postage-types"),
          fetch("/api/print-options/postage-speeds"),
          fetch(`/api/tenant/${tenantId}/print-options`),
        ]);

        if (!appsRes.ok || !tenantRes.ok) {
          throw new Error("Erreur lors du chargement");
        }

        const apps = await appsRes.json();
        const tenant = await tenantRes.json();
        const colors = await colorsRes.json();
        const sides = await sidesRes.json();
        const envelopes = await envelopesRes.json();
        const postageTypes = await postageTypesRes.json();
        const postageSpeeds = await postageSpeedsRes.json();
        const tenantPrintOptions = await tenantPrintOptionsRes.json();

        // Set all available options
        setAllApplications(apps);
        setAllColors(colors.filter((c: PrintOption) => c.isActive));
        setAllSides(sides.filter((s: PrintOption) => s.isActive));
        setAllEnvelopes(envelopes.filter((e: PrintOption) => e.isActive));
        setAllPostageTypes(postageTypes.filter((t: PrintOption) => t.isActive));
        setAllPostageSpeeds(postageSpeeds.filter((s: PrintOption) => s.isActive));

        // Set assigned IDs
        const tenantAppIds = tenant.tenant_application?.map((ta: { applicationid: number }) => ta.applicationid) || [];
        setAssignedAppIds(new Set(tenantAppIds));

        setAssignedColorIds(new Set(tenantPrintOptions.colors?.map((c: PrintOption) => c.id) || []));
        setAssignedSideIds(new Set(tenantPrintOptions.sides?.map((s: PrintOption) => s.id) || []));
        setAssignedEnvelopeIds(new Set(tenantPrintOptions.envelopes?.map((e: PrintOption) => e.id) || []));
        setAssignedPostageTypeIds(new Set(tenantPrintOptions.postageTypes?.map((t: PrintOption) => t.id) || []));
        setAssignedPostageSpeedIds(new Set(tenantPrintOptions.postageSpeeds?.map((s: PrintOption) => s.id) || []));

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erreur inconnue";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tenantId]);

  const toggleItem = (category: CategoryType, id: number) => {
    setHasChanges(true);

    switch (category) {
      case "applications":
        setAssignedAppIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) newSet.delete(id);
          else newSet.add(id);
          return newSet;
        });
        break;
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
      case "envelopes":
        setAssignedEnvelopeIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) newSet.delete(id);
          else newSet.add(id);
          return newSet;
        });
        break;
      case "postageTypes":
        setAssignedPostageTypeIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) newSet.delete(id);
          else newSet.add(id);
          return newSet;
        });
        break;
      case "postageSpeeds":
        setAssignedPostageSpeedIds(prev => {
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
      // Update applications
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

      // Update print options
      const printRes = await fetch(`/api/tenant/${tenantId}/print-options`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colorIds: Array.from(assignedColorIds),
          sideIds: Array.from(assignedSideIds),
          envelopeIds: Array.from(assignedEnvelopeIds),
          postageTypeIds: Array.from(assignedPostageTypeIds),
          postageSpeedIds: Array.from(assignedPostageSpeedIds),
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

  const renderCheckboxList = () => {
    let items: { id: number; label: string; description?: string }[] = [];
    let assignedIds: Set<number>;

    switch (activeCategory) {
      case "applications":
        items = allApplications.map(a => ({ id: a.id, label: a.nom, description: a.description }));
        assignedIds = assignedAppIds;
        break;
      case "colors":
        items = allColors.map(c => ({ id: c.id, label: c.label }));
        assignedIds = assignedColorIds;
        break;
      case "sides":
        items = allSides.map(s => ({ id: s.id, label: s.label }));
        assignedIds = assignedSideIds;
        break;
      case "envelopes":
        items = allEnvelopes.map(e => ({ id: e.id, label: e.label, description: e.description }));
        assignedIds = assignedEnvelopeIds;
        break;
      case "postageTypes":
        items = allPostageTypes.map(t => ({ id: t.id, label: t.label }));
        assignedIds = assignedPostageTypeIds;
        break;
      case "postageSpeeds":
        items = allPostageSpeeds.map(s => ({ id: s.id, label: s.label }));
        assignedIds = assignedPostageSpeedIds;
        break;
    }

    if (items.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Aucune option disponible dans cette catégorie
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {items.map(item => (
          <label
            key={item.id}
            className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              checked={assignedIds.has(item.id)}
              onChange={() => toggleItem(activeCategory, item.id)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <div className="flex-1">
              <div className="font-medium">{item.label}</div>
              {item.description && (
                <div className="text-sm text-muted-foreground">{item.description}</div>
              )}
            </div>
          </label>
        ))}
      </div>
    );
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

      <div className="flex gap-4 min-h-[400px]">
        {/* Left Panel - Categories */}
        <div className="w-48 flex-shrink-0 border-r pr-4">
          <div className="space-y-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel - Checkboxes */}
        <div className="flex-1 overflow-auto max-h-[400px]">
          {renderCheckboxList()}
        </div>
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
