"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
}

interface UserWithTenant {
  id: string;
  email: string;
  name?: string | null;
  role: "SUPERADMIN" | "ADMIN" | "MEMBER";
  tenantId: string;
  tenant: { subdomain: string; name: string }; // tenant obligatoire
}

interface CreateUserProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  subdomain: string; // Le subdomain actuel
  defaultRole?: "ADMIN" | "MEMBER" | "SUPERADMIN";
}

export default function CreateUser({
  onSuccess,
  onCancel,
  subdomain,
  defaultRole = "MEMBER",
}: CreateUserProps) {
  const [formData, setFormData] = useState<Partial<UserWithTenant & { tenantSubdomain: string }>>({
    email: "",
    name: "",
    role: defaultRole,
    tenantId: "",
    tenantSubdomain: subdomain === "admin" ? "" : subdomain,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tenantName, setTenantName] = useState(subdomain);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const isAdminSubdomain = subdomain === "admin";

  // Fetch tenants si admin, sinon récupérer le tenant actuel
  useEffect(() => {
    if (isAdminSubdomain) {
      const fetchTenants = async () => {
        try {
          const res = await fetch(`/api/tenant`);
          if (!res.ok) throw new Error("Impossible de récupérer les tenants");
          const data = await res.json();
          setTenants(data);
        } catch (err: any) {
          setError(err.message || "Impossible de récupérer les tenants");
        }
      };
      fetchTenants();
    } else {
      const fetchTenantName = async () => {
        try {
          const res = await fetch(`/api/tenant?subdomain=${subdomain}`);
          if (!res.ok) throw new Error("Client introuvable");
          const data = await res.json();
          setTenantName(data.name);
          setFormData((prev) => ({ ...prev, tenantId: data.id, tenantSubdomain: subdomain }));
        } catch (err: any) {
          setError(err.message || "Impossible de récupérer le client");
        }
      };
      fetchTenantName();
    }
  }, [subdomain, isAdminSubdomain]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload: any = {
        email: formData.email,
        name: formData.name,
        role: formData.role,
      };

      if (isAdminSubdomain) {
        if (formData.tenantSubdomain) {
          payload.tenantSubdomain = formData.tenantSubdomain;
        } else {
          setError("Veuillez sélectionner un tenant");
          setLoading(false);
          return;
        }
      } else {
        payload.tenantSubdomain = subdomain;
      }

      const endpoint = isAdminSubdomain ? "/api/admin/users" : `/api/tenant/users?subdomain=${subdomain}`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const { error: apiError } = await res.json();
        setError(apiError || "Erreur lors de la création.");
        setLoading(false);
        return;
      }

      if (onSuccess) onSuccess();

      // Reset form
      setFormData({
        email: "",
        name: "",
        role: defaultRole,
        tenantId: "",
        tenantSubdomain: isAdminSubdomain ? "" : subdomain,
      });
    } catch (err: any) {
      setError(err.message || "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-foreground">Créer un utilisateur {tenantName}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            placeholder="email@example.com"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Un email d'invitation sera envoyé avec le lien de connexion et le mot de passe par défaut: <code className="bg-muted px-1 py-0.5 rounded">password</code>
          </p>
        </div>

        {/* Nom */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nom
          </label>
          <input
            type="text"
            name="name"
            value={formData.name || ""}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            placeholder="Nom complet"
          />
        </div>

        {/* Rôle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Rôle *
          </label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="MEMBER">MEMBER</option>
            <option value="ADMIN">ADMIN</option>
            {isAdminSubdomain && <option value="SUPERADMIN">SUPERADMIN</option>}
          </select>
        </div>

        {/* Tenant */}
        {isAdminSubdomain && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Client *
            </label>
            <select
              name="tenantSubdomain"
              value={formData.tenantSubdomain}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Sélectionner un Client</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.subdomain}>
                  {tenant.name} ({tenant.subdomain})
                </option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div className="bg-destructive/20 border border-destructive text-destructive px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? "Création..." : "Créer"}
          </Button>
          {onCancel && (
            <Button type="button" onClick={onCancel} variant="outline">
              Annuler
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
