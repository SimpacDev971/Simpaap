"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface DeletePrintOptionProps {
  optionId: number;
  optionLabel: string;
  apiEndpoint: string; // e.g., "/api/print-options/colors"
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function DeletePrintOption({
  optionId,
  optionLabel,
  apiEndpoint,
  onSuccess,
  onCancel,
}: DeletePrintOptionProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${apiEndpoint}/${optionId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erreur lors de la suppression");
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
    <div className="space-y-4">
      <p className="text-foreground">
        Êtes-vous sûr de vouloir supprimer l'option{" "}
        <span className="font-semibold">&quot;{optionLabel}&quot;</span> ?
      </p>
      <p className="text-sm text-muted-foreground">
        Cette action est irréversible.
      </p>

      {error && (
        <div className="bg-destructive/20 border border-destructive text-destructive px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button
          onClick={handleDelete}
          disabled={loading}
          variant="destructive"
          className="flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Suppression...
            </>
          ) : (
            "Supprimer"
          )}
        </Button>
        {onCancel && (
          <Button type="button" onClick={onCancel} variant="outline">
            Annuler
          </Button>
        )}
      </div>
    </div>
  );
}
