import AppSelector from "@/components/AppSelector";
import ProtectedPage from "@/components/auth/ProtectedPage";


export default async function SimpApp({ params }: { params: Promise<{ subdomain: string }> }) {
  const { subdomain } = await params;

  return (
    <ProtectedPage permission={{
      allowedRoles: ["SUPERADMIN", "ADMIN","MEMBER"],
      requireAuth: true,
      requireTenantMatch: true,
    }} subdomain={subdomain}>
    <div className="space-y-6">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Sélectionnez votre flux de traitement
        </h1>

        {/* Client Component qui gère l'état */}
        <AppSelector />
      </div>
    </div>
    </ProtectedPage>
  );
}
