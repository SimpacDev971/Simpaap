"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface DeleteTenantProps {
  tenantId: string;
  tenantName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function DeleteTenant({
  tenantId,
  tenantName,
  onSuccess,
  onCancel,
}: DeleteTenantProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const handleDelete = async () => {
    if (confirmText !== "SUPPRIMER") {
      setError("Veuillez taper 'SUPPRIMER' pour confirmer");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/tenant/delete?id=${tenantId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const { error: apiError } = await res.json();
        setError(apiError || "Erreur lors de la suppression.");
        return;
      }

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-destructive">Supprimer le tenant</h2>
      <div className="space-y-4">
        <p className="text-foreground">
          Êtes-vous sûr de vouloir supprimer le tenant <strong className="text-foreground">{tenantName}</strong> ?
        </p>
        <div className="bg-accent border border-accent text-accent-foreground px-4 py-3 rounded">
          <p className="font-semibold">Attention !</p>
          <p className="text-sm mt-1">
            Tous les utilisateurs de ce tenant (sauf les SUPERADMIN) seront également supprimés.
            Cette action est irréversible.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Tapez <strong>SUPPRIMER</strong> pour confirmer
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-destructive bg-background text-foreground placeholder-muted-foreground"
            placeholder="SUPPRIMER"
          />
        </div>
        {error && (
          <div className="bg-destructive/20 border border-destructive text-destructive px-4 py-3 rounded">{error}</div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleDelete}
            disabled={loading || confirmText !== "SUPPRIMER"}
            variant="destructive"
            className="flex-1"
          >
            {loading ? "Suppression..." : "Supprimer"}
          </Button>
          {onCancel && (
            <Button
              onClick={onCancel}
              variant="outline"
            >
              Annuler
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
