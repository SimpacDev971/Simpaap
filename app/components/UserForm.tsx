"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export interface User {
  email: string;
  password: string;
  name?: string;
  role: "ADMIN" | "MEMBER" | "SUPERADMIN";
  tenantId?: string; // facultatif pour SUPERADMIN
}

interface UserFormProps {
  user?: User;
  hideTenantId?: boolean;
  redirectTo?: string; // optionnel, page après création
  onSave?: (user: User) => void | Promise<void>; // callback optionnel pour gérer la soumission
  loading?: boolean; // état de chargement externe optionnel
}

export default function UserForm({ user, hideTenantId, redirectTo, onSave, loading: externalLoading }: UserFormProps) {
  const [formData, setFormData] = useState<User>(
    user || { email: "", password: "", name: "", role: "MEMBER", tenantId: "" }
  );
  const [internalLoading, setInternalLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  
  // Utilise le loading externe si fourni, sinon le loading interne
  const loading = externalLoading !== undefined ? externalLoading : internalLoading;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Si onSave est fourni, l'utiliser et laisser le parent gérer
    if (onSave) {
      try {
        await onSave(formData);
      } catch (err: any) {
        setError(err.message || "Erreur inattendue");
      }
      return;
    }

    // Sinon, comportement par défaut avec l'API
    setInternalLoading(true);
    setError("");

    try {
      const payload = { ...formData };
      if (!payload.tenantId) delete payload.tenantId; // supprime clé vide

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setInternalLoading(false);

      if (!res.ok) {
        const { error: apiError } = await res.json();
        setError(apiError || "Erreur lors de la création utilisateur.");
        return;
      }

      // succès → redirection si indiqué
      if (redirectTo) router.push(redirectTo);
      else alert("Utilisateur créé avec succès !");
    } catch (err: any) {
      setInternalLoading(false);
      setError(err.message || "Erreur inattendue");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="email"
        name="email"
        placeholder="Email"
        value={formData.email}
        onChange={handleChange}
        required
      />
      <input
        type="text"
        name="name"
        placeholder="Nom"
        value={formData.name}
        onChange={handleChange}
      />
      <input
        type="password"
        name="password"
        placeholder="Mot de passe"
        value={formData.password}
        onChange={handleChange}
        required
      />
      {!hideTenantId && (
        <input
          type="text"
          name="tenantId"
          placeholder="Tenant ID"
          value={formData.tenantId || ""}
          onChange={handleChange}
        />
      )}
      <select name="role" value={formData.role} onChange={handleChange}>
        <option value="MEMBER">MEMBER</option>
        <option value="ADMIN">ADMIN</option>
        <option value="SUPERADMIN">SUPERADMIN</option>
      </select>
      <button type="submit" disabled={loading} className="bg-blue-500 text-white px-4 py-2 rounded">
        {loading ? "Chargement..." : "Sauvegarder"}
      </button>
      {error && <div className="text-red-500 mt-2">{error}</div>}
    </form>
  );
}
