"use client";
import ProtectedComponent from "@/components/auth/ProtectedComponent";
import { getRoutePermission } from "@/lib/auth/permissions";
import UserForm from "../../../components/UserForm";

export default function CreateUserPage() {
  const permission = getRoutePermission("/admin/users/create") || {
    allowedRoles: ["SUPERADMIN"],
    requireAuth: true,
  };

  return (
    <ProtectedComponent permission={permission}>
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-lg bg-white shadow rounded-xl p-8">
          <h1 className="text-2xl font-bold mb-4">Créer un utilisateur</h1>
          <UserForm />
        </div>
      </div>
    </ProtectedComponent>
  );
}
