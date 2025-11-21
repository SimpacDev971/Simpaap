"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface DeleteUserProps {
  userId: string;
  userName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  tenantId?: string;
}

export default function DeleteUser({
  userId,
  userName,
  onSuccess,
  onCancel,
  tenantId,
}: DeleteUserProps) {
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
      const endpoint = tenantId
        ? `/api/tenant/users?subdomain=${tenantId}&id=${userId}`
        : `/api/admin/users?id=${userId}`;

      const res = await fetch(endpoint, {
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
      <h2 className="text-2xl font-bold mb-4 text-red-600 dark:text-red-400">Supprimer l'utilisateur</h2>
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          Êtes-vous sûr de vouloir supprimer l'utilisateur <strong className="text-gray-900 dark:text-white">{userName}</strong> ?
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Cette action est irréversible.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tapez <strong>SUPPRIMER</strong> pour confirmer
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            placeholder="SUPPRIMER"
          />
        </div>

        {error && (
          <div className="bg-destructive border border-destructive/20 text-destructive-foreground px-4 py-3 rounded">
            {error}
          </div>
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
