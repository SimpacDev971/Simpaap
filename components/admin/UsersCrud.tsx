import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import CreateUser from "@/components/users/CreateUser";
import DeleteUser from "@/components/users/DeleteUser";
import UpdateUser from "@/components/users/UpdateUser";
import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

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

type SortField = "email" | "name" | "role" | "tenant";
type SortDirection = "asc" | "desc" | null;

export default function UsersCrud({ tenantSubdomain }: UsersCrudProps) {
  const [users, setUsers] = useState<UserWithTenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithTenant | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserWithTenant | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedUsers = useMemo(() => {
    let result = [...users];

    // Filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (user) =>
          user.email.toLowerCase().includes(term) ||
          user.name?.toLowerCase().includes(term) ||
          user.role.toLowerCase().includes(term) ||
          user.tenant.name.toLowerCase().includes(term) ||
          user.tenant.subdomain.toLowerCase().includes(term)
      );
    }

    // Sort
    if (sortField && sortDirection) {
      result.sort((a, b) => {
        let aValue: string;
        let bValue: string;

        switch (sortField) {
          case "email":
            aValue = a.email;
            bValue = b.email;
            break;
          case "name":
            aValue = a.name || "";
            bValue = b.name || "";
            break;
          case "role":
            aValue = a.role;
            bValue = b.role;
            break;
          case "tenant":
            aValue = a.tenant.name;
            bValue = b.tenant.name;
            break;
          default:
            return 0;
        }

        const comparison = aValue.localeCompare(bValue);
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [users, searchTerm, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-4 w-4 inline" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-4 w-4 inline" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4 inline" />
    );
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

      {/* Search Filter */}
      <div className="flex gap-4 items-center">
        <Input
          type="text"
          placeholder="Rechercher par email, nom, rôle ou client..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        {searchTerm && (
          <Button variant="outline" size="sm" onClick={() => setSearchTerm("")}>
            Effacer
          </Button>
        )}
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
              <th
                className="p-3 text-left text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
                onClick={() => handleSort("email")}
              >
                Email
                <SortIcon field="email" />
              </th>
              <th
                className="p-3 text-left text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
                onClick={() => handleSort("name")}
              >
                Nom
                <SortIcon field="name" />
              </th>
              <th
                className="p-3 text-left text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
                onClick={() => handleSort("role")}
              >
                Rôle
                <SortIcon field="role" />
              </th>
              {session?.user.role === "SUPERADMIN" && (
                <th
                  className="p-3 text-left text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
                  onClick={() => handleSort("tenant")}
                >
                  Client
                  <SortIcon field="tenant" />
                </th>
              )}
              <th className="p-3 text-right text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedUsers.map((user) => (
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

      {!loading && filteredAndSortedUsers.length === 0 && users.length > 0 && (
        <p className="text-center text-muted-foreground">Aucun utilisateur ne correspond à votre recherche</p>
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
