import { UserRole } from "@/lib/auth/types/auth";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../app/api/auth/[...nextauth]/route";

export interface UserAccess {
  isLogged: boolean;
  isAdmin: boolean;
  isSameTenant: boolean;
  role: UserRole | null;
  userTenant: string | null;
}

/**
 * Récupère les informations de session et les droits de l'utilisateur
 */
export async function getUserAccess(subdomain: string): Promise<UserAccess> {
  const session = await getServerSession(authOptions);

  const user = session?.user ?? null;
  const role = user?.role ?? null;
  const userTenant = user?.tenantSlug ?? null;

  return {
    isLogged: !!user,
    isAdmin: role === "ADMIN" || role === "SUPERADMIN",
    isSameTenant: role === "SUPERADMIN" || userTenant === subdomain,
    role,
    userTenant,
  };
}
