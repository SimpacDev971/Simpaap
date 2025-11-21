"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

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
    <div className="bg-background rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-foreground">Créer un tenant</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Nom du tenant *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground placeholder-muted-foreground"
            placeholder="Nom de l'organisation"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Subdomain *</label>
          <input
            type="text"
            name="subdomain"
            value={formData.subdomain}
            onChange={handleChange}
            required
            pattern="[a-z0-9-]+"
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground placeholder-muted-foreground"
            placeholder="mon-tenant"
          />
          <p className="text-xs text-muted-foreground mt-1">Uniquement des lettres minuscules, chiffres et tirets</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Email de l'administrateur *</label>
          <input
            type="email"
            name="adminEmail"
            value={formData.adminEmail}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground placeholder-muted-foreground"
            placeholder="admin@example.com"
          />
          <p className="text-xs text-muted-foreground mt-1">Un utilisateur admin sera créé avec le mot de passe par défaut "password"</p>
        </div>
        {error && (
          <div className="bg-destructive/20 border border-destructive text-destructive px-4 py-3 rounded">{error}</div>
        )}

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={loading}
            className="flex-1"
          >
            {loading ? "Création..." : "Créer"}
          </Button>
          {onCancel && (
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
            >
              Annuler
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
