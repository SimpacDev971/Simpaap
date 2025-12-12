"use client";

import { hasRoleAccess } from "@/lib/auth/permissions";
import { RoutePermission, SessionUser } from "@/lib/types/auth";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

/**
 * Props pour le composant ProtectedComponent
 */
export interface ProtectedComponentProps {
  /** Les enfants à rendre si l'accès est autorisé */
  children: ReactNode;
  /** La configuration de permission */
  permission: RoutePermission;
  /** Le subdomain actuel (optionnel) */
  subdomain?: string;
  /** Composant à afficher pendant la vérification */
  loadingComponent?: ReactNode;
  /** Composant à afficher si l'accès est refusé */
  fallbackComponent?: ReactNode;
}

/**
 * Composant client pour protéger les composants côté client
 * 
 * Utilisation:
 * ```tsx
 * export default function MyComponent() {
 *   return (
 *     <ProtectedComponent
 *       permission={{
 *         allowedRoles: ["ADMIN", "SUPERADMIN"],
 *         requireAuth: true,
 *       }}
 *       loadingComponent={<div>Chargement...</div>}
 *       fallbackComponent={<div>Accès refusé</div>}
 *     >
 *       <YourComponentContent />
 *     </ProtectedComponent>
 *   );
 * }
 * ```
 */
export default function ProtectedComponent({
  children,
  permission,
  subdomain,
  loadingComponent,
  fallbackComponent,
}: ProtectedComponentProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (status === "loading") {
      setIsAuthorized(null);
      return;
    }

    if (status === "unauthenticated") {
      if (permission.requireAuth) {
        setIsAuthorized(false);
        if (permission.redirectTo) {
          router.push(permission.redirectTo);
        }
        return;
      }
      // Si requireAuth est false, on autorise
      setIsAuthorized(true);
      return;
    }

    if (!session?.user) {
      setIsAuthorized(false);
      return;
    }

    const user = session.user as SessionUser;

    // Vérification du rôle
    if (!hasRoleAccess(user.role, permission)) {
      setIsAuthorized(false);
      return;
    }

    // Vérification du tenant si nécessaire
    if (permission.requireTenantMatch && subdomain) {
      // SUPERADMIN peut accéder à tous les tenants
      if (user.role === "SUPERADMIN") {
        setIsAuthorized(true);
        return;
      }
      
      if (user.tenantSlug !== subdomain) {
        setIsAuthorized(false);
        return;
      }
    }

    setIsAuthorized(true);
  }, [session, status, permission, subdomain, router]);

  // Affichage pendant le chargement
  if (status === "loading" || isAuthorized === null) {
    return <>{loadingComponent || <div>Chargement...</div>}</>;
  }

  // Accès refusé
  if (!isAuthorized) {
    return <>{fallbackComponent || <div>Accès refusé</div>}</>;
  }

  // Accès autorisé
  return <>{children}</>;
}
