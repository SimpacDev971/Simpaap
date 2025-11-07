import ProtectedPage from '@/components/auth/ProtectedPage';
import { getSubdomainRoutePermission } from '@/lib/auth/permissions';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';

export default async function SubdomainPage({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;
  
  const permission = getSubdomainRoutePermission("/admin", subdomain) || {
    allowedRoles: ["SUPERADMIN", "ADMIN"],
    requireAuth: true,
    requireTenantMatch: true, // ADMIN doit être du même tenant
  };

  try {
    const tenant = await prisma.tenant.findFirst({
      where: { subdomain },
    });
    
    if (!tenant) notFound();

    return (
      <ProtectedPage permission={permission} subdomain={subdomain}>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Administration de {tenant.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Bienvenue dans l'espace d'administration pour {subdomain}
          </p>
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Informations du tenant
            </h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Nom</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{tenant.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Subdomain</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{tenant.subdomain}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Créé le</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {new Date(tenant.createdAt).toLocaleDateString("fr-FR")}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </ProtectedPage>
    );
  } catch (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-2">
        <h1 className="text-4xl font-bold text-red-500">Error</h1>
        <p>There was an error loading the tenant information.</p>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }
}