"use client";

import CreateTenant from "@/components/tenants/CreateTenant";
import DeleteTenant from "@/components/tenants/DeleteTenant";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  createdAt: string;
}

export default function TenantsCrud() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);

  const fetchTenants = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/tenant`);
      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
      const data: Tenant[] = await res.json();
      setTenants(data);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des tenants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleSuccess = () => {
    fetchTenants();
    setShowCreate(false);
    setDeletingTenant(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Create */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-foreground">Gestion des tenants</h2>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button>+ Créer un tenant</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un tenant</DialogTitle>
            </DialogHeader>
            <CreateTenant onSuccess={handleSuccess} onCancel={() => setShowCreate(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Modals */}
      <Dialog open={!!deletingTenant} onOpenChange={(open) => !open && setDeletingTenant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le tenant</DialogTitle>
          </DialogHeader>
          {deletingTenant && (
            <DeleteTenant
              tenantId={deletingTenant.id}
              tenantName={deletingTenant.name}
              onSuccess={handleSuccess}
              onCancel={() => setDeletingTenant(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Table Tenants */}
      {loading ? (
        <p className="text-center py-8 text-muted-foreground">Chargement...</p>
      ) : (
        <table className="w-full border-collapse bg-card rounded-lg overflow-hidden">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-left text-muted-foreground">Nom</th>
              <th className="p-3 text-left text-muted-foreground">Subdomain</th>
              <th className="p-3 text-left text-muted-foreground">Créé le</th>
              <th className="p-3 text-right text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id}>
                <td className="p-3">{tenant.name}</td>
                <td className="p-3">{tenant.subdomain}</td>
                <td className="p-3">{new Date(tenant.createdAt).toLocaleDateString("fr-FR")}</td>
                <td className="text-right p-3">
                  <Button
                    onClick={() => setDeletingTenant(tenant)}
                    variant="destructive"
                  >
                    Supprimer
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && tenants.length === 0 && (
        <p className="text-center text-muted-foreground">Aucun tenant trouvé</p>
      )}
      {error && <div className="bg-destructive/20 border border-destructive text-destructive px-4 py-3 rounded">{error}</div>}
    </div>
  );
}
