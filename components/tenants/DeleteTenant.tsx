"use client";

import { useState } from "react";

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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-red-600 dark:text-red-400">Supprimer le tenant</h2>
      <div className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300">
          Êtes-vous sûr de vouloir supprimer le tenant <strong className="text-gray-900 dark:text-white">{tenantName}</strong> ?
        </p>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 px-4 py-3 rounded">
          <p className="font-semibold">Attention !</p>
          <p className="text-sm mt-1">
            Tous les utilisateurs de ce tenant (sauf les SUPERADMIN) seront également supprimés.
            Cette action est irréversible.
          </p>
        </div>

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
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={loading || confirmText !== "SUPPRIMER"}
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Suppression..." : "Supprimer"}
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
            >
              Annuler
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
