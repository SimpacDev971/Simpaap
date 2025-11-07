"use client";
import ProtectedComponent from "@/components/auth/ProtectedComponent";
import CreateTenant from "@/components/tenants/CreateTenant";
import DeleteTenant from "@/components/tenants/DeleteTenant";
import CreateUser from "@/components/users/CreateUser";
import DeleteUser from "@/components/users/DeleteUser";
import UpdateUser from "@/components/users/UpdateUser";
import { getRoutePermission } from "@/lib/auth/permissions";
import { useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  name?: string | null;
  role: "SUPERADMIN" | "ADMIN" | "MEMBER";
  tenantId?: string | null;
  tenant?: { name: string } | null;
}

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  createdAt: string;
}

type TabType = "users" | "tenants";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>("users");
  
  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  
  // Tenants state
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
  const [showCreateTenant, setShowCreateTenant] = useState(false);
  
  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const permission = getRoutePermission("/admin") || {
    allowedRoles: ["SUPERADMIN", "ADMIN"],
    requireAuth: true,
  };

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users`);
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

  // Fetch tenants
  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant`);
      if (res.ok) {
        const data = await res.json();
        setTenants(data);
      } else {
        setError("Erreur lors du chargement des tenants");
      }
    } catch (err) {
      setError("Erreur lors du chargement des tenants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    } else {
      fetchTenants();
    }
  }, [activeTab]);

  const handleUserSuccess = () => {
    fetchUsers();
    setShowCreateUser(false);
    setEditingUser(null);
    setDeletingUser(null);
  };

  const handleTenantSuccess = () => {
    fetchTenants();
    setShowCreateTenant(false);
    setDeletingTenant(null);
  };

  return (
    <ProtectedComponent permission={permission}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Administration
          </h1>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("users")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "users"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              Utilisateurs
            </button>
            <button
              onClick={() => setActiveTab("tenants")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "tenants"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              Tenants
            </button>
          </nav>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Gestion des utilisateurs
              </h2>
              <button
                onClick={() => setShowCreateUser(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                + Créer un utilisateur
              </button>
            </div>

            {/* Create User Modal */}
            {showCreateUser && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-2xl font-bold">Créer un utilisateur</h2>
                      <button
                        onClick={() => setShowCreateUser(false)}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        ✕
                      </button>
                    </div>
                    <CreateUser onSuccess={handleUserSuccess} onCancel={() => setShowCreateUser(false)} />
                  </div>
                </div>
              </div>
            )}

            {/* Update User Modal */}
            {editingUser && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-2xl font-bold">Modifier l'utilisateur</h2>
                      <button
                        onClick={() => setEditingUser(null)}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        ✕
                      </button>
                    </div>
                    <UpdateUser
                      user={{
                        id: editingUser.id,
                        email: editingUser.email,
                        name: editingUser.name,
                        role: editingUser.role,
                        tenantId: editingUser.tenantId || undefined,
                      }}
                      onSuccess={handleUserSuccess}
                      onCancel={() => setEditingUser(null)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Delete User Modal */}
            {deletingUser && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-2xl font-bold">Supprimer l'utilisateur</h2>
                      <button
                        onClick={() => setDeletingUser(null)}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        ✕
                      </button>
                    </div>
                    <DeleteUser
                      userId={deletingUser.id}
                      userName={deletingUser.email}
                      onSuccess={handleUserSuccess}
                      onCancel={() => setDeletingUser(null)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Users Table */}
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Tenant
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {user.tenant?.name || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => setEditingUser(user)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                          >
                            Modifier
                          </button>
                          {user.role !== "SUPERADMIN" && (
                            <button
                              onClick={() => setDeletingUser(user)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Supprimer
                            </button>
                          )}
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
        )}

        {/* Tenants Tab */}
        {activeTab === "tenants" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Gestion des tenants
              </h2>
              <button
                onClick={() => setShowCreateTenant(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                + Créer un tenant
              </button>
            </div>

            {/* Create Tenant Modal */}
            {showCreateTenant && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-2xl font-bold">Créer un tenant</h2>
                      <button
                        onClick={() => setShowCreateTenant(false)}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        ✕
                      </button>
                    </div>
                    <CreateTenant onSuccess={handleTenantSuccess} onCancel={() => setShowCreateTenant(false)} />
                  </div>
                </div>
              </div>
            )}

            {/* Delete Tenant Modal */}
            {deletingTenant && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full">
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-2xl font-bold">Supprimer le tenant</h2>
                      <button
                        onClick={() => setDeletingTenant(null)}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        ✕
                      </button>
                    </div>
                    <DeleteTenant
                      tenantId={deletingTenant.id}
                      tenantName={deletingTenant.name}
                      onSuccess={handleTenantSuccess}
                      onCancel={() => setDeletingTenant(null)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tenants Table */}
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
                        Nom
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Subdomain
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Créé le
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {tenants.map((tenant) => (
                      <tr key={tenant.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {tenant.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {tenant.subdomain}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(tenant.createdAt).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => setDeletingTenant(tenant)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {tenants.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    Aucun tenant trouvé
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </ProtectedComponent>
  );
}
