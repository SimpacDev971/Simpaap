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
  password?: string;
  name?: string | null;
  role: "ADMIN" | "MEMBER" | "SUPERADMIN";
  tenantId: string; // tenantId obligatoire
  tenant: { subdomain: string; name: string }; // tenant obligatoire
}

interface UpdateUserProps {
  user: UserWithTenant;
  onSuccess?: () => void;
  onCancel?: () => void;
  tenantSubdomain?: string; // Le subdomain actuel (pour savoir si on est sur admin ou non)
}

export default function UpdateUser({
  user,
  onSuccess,
  onCancel,
  tenantSubdomain,
}: UpdateUserProps) {
  const isAdminSubdomain = tenantSubdomain === "admin";
  const [formData, setFormData] = useState<Partial<UserWithTenant & { tenantSubdomain: string }>>({
    email: user.email,
    password: "",
    name: user.name || "",
    role: user.role,
    tenantSubdomain: user.tenant.subdomain,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);

  // Fetch tenants si on est sur admin
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
    }
  }, [isAdminSubdomain]);

  useEffect(() => {
    setFormData({
      email: user.email,
      password: "",
      name: user.name || "",
      role: user.role,
      tenantSubdomain: user.tenant.subdomain,
    });
  }, [user]);

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
        id: user.id,
        email: formData.email,
        name: formData.name,
        role: formData.role,
      };

      if (formData.password && formData.password.length > 0) {
        payload.password = formData.password;
      }

      if (isAdminSubdomain) {
        if (!formData.tenantSubdomain) {
          setError("Veuillez sélectionner un tenant");
          setLoading(false);
          return;
        }
        payload.tenantSubdomain = formData.tenantSubdomain;
      } else {
        payload.tenantSubdomain = tenantSubdomain;
      }

      const endpoint = isAdminSubdomain
        ? "/api/admin/users"
        : `/api/tenant/users?subdomain=${tenantSubdomain}`;

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const { error: apiError } = await res.json();
        setError(apiError || "Erreur lors de la mise à jour.");
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Mot de passe */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nouveau mot de passe (laisser vide pour ne pas changer)
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            placeholder="••••••••"
          />
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
              Tenant *
            </label>
            <select
              name="tenantSubdomain"
              value={formData.tenantSubdomain}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Sélectionner un tenant</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.subdomain}>
                  {tenant.name} ({tenant.subdomain})
                </option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div className="bg-destructive border border-red-200 dark:border-red-800 text-destructive-foreground px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? "Mise à jour..." : "Mettre à jour"}
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
