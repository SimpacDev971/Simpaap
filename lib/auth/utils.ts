import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { RoutePermission, SessionUser, UserRole } from "@/lib/types/auth";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { hasRoleAccess } from "./permissions";

/**
 * Obtient la session utilisateur côté serveur
 * 
 * @returns La session utilisateur ou null si non authentifié
 */
export async function getAuthSession(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return null;
  }
  return session.user as SessionUser;
}

/**
 * Vérifie si l'utilisateur est authentifié
 * 
 * @returns true si l'utilisateur est authentifié
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getAuthSession();
  return session !== null;
}

/**
 * Vérifie si l'utilisateur a un rôle spécifique
 * 
 * @param role - Le rôle à vérifier
 * @returns true si l'utilisateur a ce rôle
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const session = await getAuthSession();
  return session?.role === role;
}

/**
 * Vérifie si l'utilisateur a l'un des rôles spécifiés
 * 
 * @param roles - Les rôles à vérifier
 * @returns true si l'utilisateur a l'un de ces rôles
 */
export async function hasAnyRole(roles: UserRole[]): Promise<boolean> {
  const session = await getAuthSession();
  if (!session) return false;
  return roles.includes(session.role);
}

/**
 * Vérifie si l'utilisateur appartient au tenant spécifié
 * 
 * @param subdomain - Le subdomain du tenant
 * @returns true si l'utilisateur appartient à ce tenant
 */
export async function belongsToTenant(subdomain: string): Promise<boolean> {
  const session = await getAuthSession();
  if (!session) return false;
  
  // SUPERADMIN peut accéder à tous les tenants
  if (session.role === "SUPERADMIN") {
    return true;
  }
  
  return session.tenantSlug === subdomain;
}

/**
 * Vérifie les permissions d'accès à une route
 * 
 * @param permission - La configuration de permission
 * @param subdomain - Le subdomain actuel (optionnel)
 * @returns Un objet avec le résultat de la vérification
 */
export async function checkRouteAccess(
  permission: RoutePermission,
  subdomain?: string
): Promise<{ allowed: boolean; reason?: string }> {
  const session = await getAuthSession();

  // Vérification de l'authentification
  if (permission.requireAuth && !session) {
    return {
      allowed: false,
      reason: "Authentication required",
    };
  }

  // Si pas de session mais requireAuth est false, on autorise
  if (!session) {
    return { allowed: true };
  }

  // Vérification du rôle
  if (!hasRoleAccess(session.role, permission)) {
    return {
      allowed: false,
      reason: "Insufficient role",
    };
  }

  // Vérification du tenant si nécessaire
  if (permission.requireTenantMatch && subdomain) {
    const belongs = await belongsToTenant(subdomain);
    if (!belongs) {
      return {
        allowed: false,
        reason: "Tenant mismatch",
      };
    }
  }

  return { allowed: true };
}

/**
 * Protège une route en vérifiant les permissions
 * Redirige ou retourne 404 si l'accès est refusé
 * 
 * @param permission - La configuration de permission
 * @param subdomain - Le subdomain actuel (optionnel)
 * @returns La session utilisateur si l'accès est autorisé
 * @throws Redirige vers login ou retourne 404 si l'accès est refusé
 */
export async function protectRoute(
  permission: RoutePermission,
  subdomain?: string
): Promise<SessionUser> {
  const accessCheck = await checkRouteAccess(permission, subdomain);
  const session = await getAuthSession();

  if (!accessCheck.allowed) {
    // Si l'utilisateur n'est pas authentifié, rediriger vers login
    if (!session) {
      redirect(permission.redirectTo || "/login");
    }
    
    // Sinon, accès refusé (404)
    notFound();
  }

  if (!session) {
    redirect(permission.redirectTo || "/login");
  }

  return session;
}
