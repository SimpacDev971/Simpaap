"use client";
import ProtectedComponent from "@/components/auth/ProtectedComponent";
import CreateTenant from "@/components/tenants/CreateTenant";
import DeleteTenant from "@/components/tenants/DeleteTenant";
import { getRoutePermission } from "@/lib/auth/permissions";
import { useEffect, useState } from "react";

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  createdAt: string;
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [deleting, setDeleting] = useState<Tenant | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const permission = getRoutePermission("/admin/tenants") || {
    allowedRoles: ["SUPERADMIN"],
    requireAuth: true,
  };

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
    fetchTenants();
  }, []);

  const handleDelete = (tenant: Tenant) => {
    setDeleting(tenant);
  };

  const handleSuccess = () => {
    fetchTenants();
    setShowCreate(false);
    setDeleting(null);
  };

  return (
    <ProtectedComponent permission={permission}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Gestion des tenants
          </h1>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            + Créer un tenant
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
                  <h2 className="text-2xl font-bold">Créer un tenant</h2>
                  <button
                    onClick={() => setShowCreate(false)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>
                <CreateTenant onSuccess={handleSuccess} onCancel={() => setShowCreate(false)} />
              </div>
            </div>
          </div>
        )}

        {deleting && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">Supprimer le tenant</h2>
                  <button
                    onClick={() => setDeleting(null)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>
                <DeleteTenant
                  tenantId={deleting.id}
                  tenantName={deleting.name}
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
                        onClick={() => handleDelete(tenant)}
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
    </ProtectedComponent>
  );
}
