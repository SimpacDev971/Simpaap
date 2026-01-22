import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import CreateUser from "@/components/users/CreateUser";
import DeleteUser from "@/components/users/DeleteUser";
import UpdateUser from "@/components/users/UpdateUser";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

// Type utilisateur avec tenant obligatoire
export interface UserWithTenant {
  id: string;
  email: string;
  name?: string | null;
  role: "SUPERADMIN" | "ADMIN" | "MEMBER";
  tenantId: string;
  tenant: {
    subdomain: string;
    name: string;
  };
}

interface UsersCrudProps {
  tenantSubdomain: string;
}

export default function UsersCrud({ tenantSubdomain }: UsersCrudProps) {
  const [users, setUsers] = useState<UserWithTenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithTenant | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserWithTenant | null>(null);

  const { data: session } = useSession();

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users?tenant=${tenantSubdomain}`);
      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
      const data: UserWithTenant[] = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement des utilisateurs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSuccess = () => {
    fetchUsers();
    setShowCreate(false);
    setEditingUser(null);
    setDeletingUser(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Create */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Gestion des utilisateurs</h2>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button>+ Créer un utilisateur</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un utilisateur</DialogTitle>
            </DialogHeader>
            <CreateUser subdomain={tenantSubdomain} onSuccess={handleSuccess} onCancel={() => setShowCreate(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Modals */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier utilisateur</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <UpdateUser
              user={editingUser}
              tenantSubdomain={tenantSubdomain}
              onSuccess={handleSuccess}
              onCancel={() => setEditingUser(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer utilisateur</DialogTitle>
          </DialogHeader>
          {deletingUser && (
            <DeleteUser
              userId={deletingUser.id}
              userName={deletingUser.email}
              onSuccess={handleSuccess}
              onCancel={() => setDeletingUser(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Table Users */}
      {loading ? (
        <p className="text-center py-8 text-muted-foreground">Chargement...</p>
      ) : (
        <table className="w-full border-collapse bg-card rounded-lg overflow-hidden">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-left text-muted-foreground">Email</th>
              <th className="p-3 text-left text-muted-foreground">Nom</th>
              <th className="p-3 text-left text-muted-foreground">Rôle</th>
              {session?.user.role === "SUPERADMIN" && (
                <th className="p-3 text-left text-muted-foreground">Client</th>
              )}
              <th className="p-3 text-right text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="p-3">{user.email}</td>
                <td className="p-3">{user.name || "-"}</td>
                <td className="p-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                    {user.role}
                  </span>
                </td>
                {session?.user.role === "SUPERADMIN" && <td className="p-3">{user.tenant.name}</td>}
                <td className="text-right p-3">
                  {/* Disable edit for other SUPERADMINs (can only edit yourself if you're SUPERADMIN) */}
                  {!(user.role === "SUPERADMIN" && user.id !== session?.user?.id) && (
                    <Button
                      onClick={() => setEditingUser(user)}
                      variant="outline"
                      size="sm"
                      className="mr-2"
                    >
                      Modifier
                    </Button>
                  )}
                  {user.role !== "SUPERADMIN" && (
                    <Button
                      onClick={() => setDeletingUser(user)}
                      variant="destructive"
                      size="sm"
                    >
                      Supprimer
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && users.length === 0 && (
        <p className="text-center text-muted-foreground">Aucun utilisateur trouvé</p>
      )}
      {error && (
        <div className="bg-destructive/20 border border-destructive text-destructive px-4 py-3 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
