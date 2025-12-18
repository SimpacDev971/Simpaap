"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useState } from "react";

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

export default function PrintOptionForm({
  initialData,
  apiEndpoint,
  hasDescription = false,
  onSuccess,
  onCancel,
}: PrintOptionFormProps) {
  const isEditing = !!initialData?.id;

  const [formData, setFormData] = useState<PrintOptionData>({
    value: initialData?.value || "",
    label: initialData?.label || "",
    description: initialData?.description || "",
    isActive: initialData?.isActive ?? true,
    sortOrder: initialData?.sortOrder ?? 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.value || !formData.label) {
      setError("La valeur et le libellé sont requis");
      setLoading(false);
      return;
    }

    try {
      const url = isEditing ? `${apiEndpoint}/${initialData.id}` : apiEndpoint;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          sortOrder: parseInt(String(formData.sortOrder), 10),
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
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Valeur technique *
        </label>
        <input
          type="text"
          name="value"
          value={formData.value}
          onChange={handleChange}
          required
          pattern="[a-zA-Z0-9_-]+"
          className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
          placeholder="ex: noir_blanc"
          disabled={isEditing}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Identifiant unique (lettres, chiffres, tirets, underscores)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Libellé *
        </label>
        <input
          type="text"
          name="label"
          value={formData.label}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
          placeholder="ex: Noir et Blanc"
        />
      </div>

      {hasDescription && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
            placeholder="Description optionnelle"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Ordre d'affichage
          </label>
          <input
            type="number"
            name="sortOrder"
            value={formData.sortOrder}
            onChange={handleChange}
            min={0}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
          />
        </div>

        <div className="flex items-center pt-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium">Actif</span>
          </label>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/20 border border-destructive text-destructive px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

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
