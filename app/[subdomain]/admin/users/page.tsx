"use client";
import ProtectedComponent from "@/components/auth/ProtectedComponent";
import CreateUser from "@/components/users/CreateUser";
import DeleteUser from "@/components/users/DeleteUser";
import { getSubdomainRoutePermission } from "@/lib/auth/permissions";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  name?: string | null;
  role: "SUPERADMIN" | "ADMIN" | "MEMBER";
}

export default function UserAdminPage() {
  const params = useParams();
  const subdomain = params.subdomain as string;
  const [users, setUsers] = useState<User[]>([]);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const permission = getSubdomainRoutePermission("/admin/users", subdomain) || {
    allowedRoles: ["SUPERADMIN", "ADMIN"],
    requireAuth: true,
    requireTenantMatch: true,
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant/users?subdomain=${subdomain}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        setError("Erreur lors du chargement des utilisateurs");
      }
    } catch (err) {
      setError("Erreur lors du chargement des utilisateurs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subdomain) fetchUsers();
  }, [subdomain]);

  const handleDelete = (user: User) => {
    setDeleting(user);
  };

  const handleSuccess = () => {
    fetchUsers();
    setShowCreate(false);
    setDeleting(null);
  };

  return (
    <ProtectedComponent permission={permission} subdomain={subdomain}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Gestion des utilisateurs
          </h1>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            + Créer un utilisateur
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">Créer un utilisateur</h2>
                  <button
                    onClick={() => setShowCreate(false)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>
                <CreateUser
                  tenantId={subdomain}
                  hideTenantId
                  onSuccess={handleSuccess}
                  onCancel={() => setShowCreate(false)}
                />
              </div>
            </div>
          </div>
        )}

        {deleting && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">Supprimer l'utilisateur</h2>
                  <button
                    onClick={() => setDeleting(null)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>
                <DeleteUser
                  userId={deleting.id}
                  userName={deleting.email}
                  tenantId={subdomain}
                  onSuccess={handleSuccess}
                  onCancel={() => setDeleting(null)}
                />
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Chargement...</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Rôle
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {user.name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === "SUPERADMIN"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                            : user.role === "ADMIN"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDelete(user)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Aucun utilisateur trouvé
              </div>
            )}
          </div>
        )}
      </div>
    </ProtectedComponent>
  );
}
