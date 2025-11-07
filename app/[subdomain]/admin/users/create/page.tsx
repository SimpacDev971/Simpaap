"use client";
import UserForm, { User } from "@/app/components/UserForm";
import ProtectedComponent from "@/components/auth/ProtectedComponent";
import { getSubdomainRoutePermission } from "@/lib/auth/permissions";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function CreateTenantMemberPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { subdomain } = useParams() as { subdomain: string };

  const permission = getSubdomainRoutePermission("/admin/users/create", subdomain) || {
    allowedRoles: ["SUPERADMIN", "ADMIN"],
    requireAuth: true,
    requireTenantMatch: true,
  };

  async function handleCreate(user: User) {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/tenant/users?subdomain=${subdomain}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
    setLoading(false);
    if (res.ok) {
      router.push(`/${subdomain}/admin/users`);
    } else {
      setError("Erreur lors de la création utilisateur.");
    }
  }

  return (
    <ProtectedComponent permission={permission} subdomain={subdomain}>
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-lg bg-white shadow rounded-xl p-8">
          <h1 className="text-2xl font-bold mb-4">Créer un membre</h1>
          <UserForm onSave={handleCreate} loading={loading} hideTenantId />
          {error && <div className="mt-4 text-red-500">{error}</div>}
        </div>
      </div>
    </ProtectedComponent>
  );
}
