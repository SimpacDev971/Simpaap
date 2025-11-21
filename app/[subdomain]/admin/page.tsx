// app/[subdomain]/admin/page.tsx (Server Component)
import ClientAdmin from "@/components/admin/ClientAdmin";
import ProtectedPage from '@/components/auth/ProtectedPage';
import { getSubdomainRoutePermission } from '@/lib/auth/permissions';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';

export default async function SubdomainAdminPage({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;

  const permission = getSubdomainRoutePermission("/admin", subdomain) || {
    allowedRoles: ["SUPERADMIN", "ADMIN"],
    requireAuth: true,
    requireTenantMatch: true,
  };

  const tenant = await prisma.tenant.findFirst({ where: { subdomain } });
  if (!tenant) notFound();

  return (
    <ProtectedPage permission={permission} subdomain={subdomain}>
      <ClientAdmin tenantSubdomain={subdomain} />
    </ProtectedPage>
  );
}
