import prisma from "@/lib/prisma";
import { UserRole } from "@/lib/types/auth";
import { Session } from "next-auth";

/**
 * Tenant hébergeant les comptes SUPERADMIN
 */
export const SUPERADMIN_TENANT = "admin";

const ROLES: UserRole[] = ["SUPERADMIN", "ADMIN", "MEMBER"];

export function isValidRole(role: unknown): role is UserRole {
  return typeof role === "string" && (ROLES as string[]).includes(role);
}

/**
 * Vérifie que la session peut accéder au tenant identifié par son subdomain
 * SUPERADMIN : tous les tenants — autres rôles : uniquement leur propre tenant
 */
export function canAccessTenantSubdomain(session: Session, subdomain: string): boolean {
  if (session.user.role === "SUPERADMIN") return true;
  return !!session.user.tenantSlug && session.user.tenantSlug === subdomain;
}

/**
 * Vérifie que la session peut accéder au tenant identifié par son id
 */
export async function canAccessTenantId(session: Session, tenantId: string): Promise<boolean> {
  if (session.user.role === "SUPERADMIN") return true;
  if (!session.user.tenantSlug) return false;
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { subdomain: true },
  });
  return !!tenant && tenant.subdomain === session.user.tenantSlug;
}

/**
 * Vérifie qu'un rôle peut être attribué à un utilisateur du tenant cible
 * - SUPERADMIN : uniquement sur le tenant admin, par un SUPERADMIN connecté sur le tenant admin
 * - ADMIN / MEMBER : par un SUPERADMIN ou un ADMIN
 *
 * @returns Un message d'erreur, ou null si l'attribution est autorisée
 */
export function checkRoleAssignment(
  session: Session,
  role: unknown,
  targetTenantSubdomain: string | null | undefined
): string | null {
  if (!isValidRole(role)) {
    return "Rôle invalide";
  }

  if (role === "SUPERADMIN") {
    if (session.user.role !== "SUPERADMIN" || session.user.tenantSlug !== SUPERADMIN_TENANT) {
      return "Seul un SUPERADMIN connecté sur le tenant admin peut attribuer le rôle SUPERADMIN";
    }
    if (targetTenantSubdomain !== SUPERADMIN_TENANT) {
      return "Le rôle SUPERADMIN ne peut être attribué que sur le tenant admin";
    }
    return null;
  }

  if (session.user.role !== "SUPERADMIN" && session.user.role !== "ADMIN") {
    return "Accès refusé";
  }

  return null;
}
