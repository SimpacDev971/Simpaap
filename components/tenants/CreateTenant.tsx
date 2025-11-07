"use client";

import { useState } from "react";

interface CreateTenantProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CreateTenant({
  onSuccess,
  onCancel,
}: CreateTenantProps) {
  const [formData, setFormData] = useState({
    name: "",
    subdomain: "",
    adminEmail: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.adminEmail) {
      setError("L'email de l'administrateur est requis");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/create-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          subdomain: formData.subdomain,
          adminEmail: formData.adminEmail,
        }),
      });

      if (!res.ok) {
        const { error: apiError } = await res.json();
        setError(apiError || "Erreur lors de la création.");
        return;
      }

      if (onSuccess) onSuccess();
      // Reset form
      setFormData({
        name: "",
        subdomain: "",
        adminEmail: "",
      });
    } catch (err: any) {
      setError(err.message || "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Créer un tenant</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nom du tenant *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            placeholder="Nom de l'organisation"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Subdomain *
          </label>
          <input
            type="text"
            name="subdomain"
            value={formData.subdomain}
            onChange={handleChange}
            required
            pattern="[a-z0-9-]+"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            placeholder="mon-tenant"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Uniquement des lettres minuscules, chiffres et tirets
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email de l'administrateur *
          </label>
          <input
            type="email"
            name="adminEmail"
            value={formData.adminEmail}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            placeholder="admin@example.com"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Un utilisateur admin sera créé avec le mot de passe par défaut "password"
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Création..." : "Créer"}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
            >
              Annuler
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
