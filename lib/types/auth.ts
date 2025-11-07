import { Role } from "@prisma/client";

/**
 * Types pour l'authentification et l'autorisation
 */

export type UserRole = Role;

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  tenantSlug?: string | null;
}

export interface AuthSession {
  user: SessionUser;
  expires: string;
}

/**
 * Configuration de permission pour une route
 */
export interface RoutePermission {
  /** Rôles autorisés à accéder à cette route */
  allowedRoles: UserRole[];
  /** Si true, nécessite que l'utilisateur soit authentifié (mais n'importe quel rôle) */
  requireAuth?: boolean;
  /** Si true, nécessite que l'utilisateur appartienne au tenant du subdomain */
  requireTenantMatch?: boolean;
  /** Message d'erreur personnalisé si l'accès est refusé */
  errorMessage?: string;
  /** Redirection personnalisée si l'accès est refusé */
  redirectTo?: string;
}

/**
 * Options pour la protection d'une page
 */
export interface ProtectPageOptions extends RoutePermission {
  /** Chemin de la route (pour le logging) */
  routePath?: string;
}
