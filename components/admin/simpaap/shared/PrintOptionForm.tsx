"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export interface PrintOptionData {
  id?: number;
  value: string;
  label: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

interface PrintOptionFormProps {
  initialData?: PrintOptionData;
  apiEndpoint: string; // e.g., "/api/print-options/colors"
  hasDescription?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Generate a unique code from label
function generateCode(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9\s]/g, "") // Remove special chars
    .replace(/\s+/g, "_") // Replace spaces with underscore
    .substring(0, 50); // Limit length
}

export default function PrintOptionForm({
  initialData,
  apiEndpoint,
  hasDescription = false,
  onSuccess,
  onCancel,
}: PrintOptionFormProps) {
  const isEditing = !!initialData?.id;

  const [formData, setFormData] = useState({
    label: initialData?.label || "",
    description: initialData?.description || "",
    isActive: initialData?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.label.trim()) {
      setError("Le libellé est requis");
      setLoading(false);
      return;
    }

    try {
      const url = isEditing ? `${apiEndpoint}/${initialData.id}` : apiEndpoint;
      const method = isEditing ? "PUT" : "POST";

      // Auto-generate value from label (only for new items)
      const value = isEditing ? initialData.value : generateCode(formData.label);

      // Auto-generate sortOrder (get next available order)
      let sortOrder = initialData?.sortOrder ?? 0;
      if (!isEditing) {
        // Fetch existing items to determine next sortOrder
        const listRes = await fetch(apiEndpoint);
        if (listRes.ok) {
          const items = await listRes.json();
          sortOrder = items.length > 0 ? Math.max(...items.map((i: PrintOptionData) => i.sortOrder)) + 1 : 0;
        }
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          value,
          sortOrder,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erreur lors de l'enregistrement");
        return;
      }

      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inattendue";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-destructive/20 border border-destructive text-destructive px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="label">Libellé *</Label>
        <Input
          id="label"
          value={formData.label}
          onChange={(e) => handleChange("label", e.target.value)}
          placeholder="Ex: Noir et Blanc"
          required
        />
        <p className="text-xs text-muted-foreground">
          Le nom affiché pour cette option
        </p>
      </div>

      {hasDescription && (
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
            placeholder="Description optionnelle"
          />
        </div>
      )}

      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-0.5">
          <Label htmlFor="isActive">Statut</Label>
          <p className="text-xs text-muted-foreground">
            Rendre cette option disponible
          </p>
        </div>
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => handleChange("isActive", checked)}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : isEditing ? (
            "Mettre à jour"
          ) : (
            "Créer"
          )}
        </Button>
        {onCancel && (
          <Button type="button" onClick={onCancel} variant="outline">
            Annuler
          </Button>
        )}
      </div>
    </form>
  );
}
