import { UserRole } from "@/lib/types/auth";
import { RoutePermission } from "@/lib/types/auth";

/**
 * Configuration centralisée des permissions par route
 * 
 * Cette configuration permet de définir facilement quels rôles peuvent accéder à chaque route.
 * Pour ajouter une nouvelle route, ajoutez simplement son chemin ici.
 */

export const ROUTE_PERMISSIONS: Record<string, RoutePermission> = {
  // Routes admin globales (sans subdomain)
  "/admin": {
    allowedRoles: ["SUPERADMIN", "ADMIN"],
    requireAuth: true,
    errorMessage: "Accès refusé. Seuls les administrateurs peuvent accéder à cette page.",
    redirectTo: "/login",
  },
  "/admin/users": {
    allowedRoles: ["SUPERADMIN", "ADMIN"],
    requireAuth: true,
    errorMessage: "Accès refusé. Seuls les administrateurs peuvent gérer les utilisateurs.",
    redirectTo: "/login",
  },
  "/admin/users/create": {
    allowedRoles: ["SUPERADMIN"],
    requireAuth: true,
    errorMessage: "Accès refusé. Seuls les super administrateurs peuvent créer des utilisateurs.",
    redirectTo: "/login",
  },
  "/admin/tenants": {
    allowedRoles: ["SUPERADMIN"],
    requireAuth: true,
    errorMessage: "Accès refusé. Seuls les super administrateurs peuvent gérer les tenants.",
    redirectTo: "/login",
  },

  // Routes admin avec subdomain
  "/[subdomain]/admin": {
    allowedRoles: ["SUPERADMIN", "ADMIN"],
    requireAuth: true,
    requireTenantMatch: true, // ADMIN doit être du même tenant, SUPERADMIN peut accéder à tous
    errorMessage: "Accès refusé. Vous n'avez pas les permissions pour accéder à cette page.",
    redirectTo: "/login",
  },
  "/[subdomain]/admin/users": {
    allowedRoles: ["SUPERADMIN", "ADMIN"],
    requireAuth: true,
    requireTenantMatch: true, // ADMIN doit être du même tenant
    errorMessage: "Accès refusé. Vous n'avez pas les permissions pour gérer les utilisateurs de ce tenant.",
    redirectTo: "/login",
  },
  "/[subdomain]/admin/users/create": {
    allowedRoles: ["SUPERADMIN", "ADMIN"],
    requireAuth: true,
    requireTenantMatch: true,
    errorMessage: "Accès refusé. Vous n'avez pas les permissions pour créer des utilisateurs dans ce tenant.",
    redirectTo: "/login",
  },
};

/**
 * Obtient la configuration de permission pour une route donnée
 * 
 * @param routePath - Le chemin de la route (ex: "/admin", "/[subdomain]/admin/users")
 * @returns La configuration de permission ou undefined si non trouvée
 */
export function getRoutePermission(routePath: string): RoutePermission | undefined {
  return ROUTE_PERMISSIONS[routePath];
}

/**
 * Obtient la configuration de permission pour une route avec subdomain
 * 
 * @param routePath - Le chemin de la route sans le subdomain (ex: "/admin/users")
 * @param subdomain - Le subdomain actuel
 * @returns La configuration de permission ou undefined si non trouvée
 */
export function getSubdomainRoutePermission(
  routePath: string,
  subdomain?: string
): RoutePermission | undefined {
  // Construit le chemin avec le pattern [subdomain]
  const fullPath = `/[subdomain]${routePath}`;
  return ROUTE_PERMISSIONS[fullPath];
}

/**
 * Vérifie si un rôle a accès à une route
 * 
 * @param userRole - Le rôle de l'utilisateur
 * @param permission - La configuration de permission
 * @returns true si l'utilisateur a accès
 */
export function hasRoleAccess(userRole: UserRole, permission: RoutePermission): boolean {
  return permission.allowedRoles.includes(userRole);
}
