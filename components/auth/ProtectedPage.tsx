import { ReactNode } from "react";
import { protectRoute } from "@/lib/auth/utils";
import { RoutePermission } from "@/lib/types/auth";

/**
 * Props pour le composant ProtectedPage
 */
export interface ProtectedPageProps {
  /** Les enfants à rendre si l'accès est autorisé */
  children: ReactNode;
  /** La configuration de permission */
  permission: RoutePermission;
  /** Le subdomain actuel (optionnel) */
  subdomain?: string;
  /** Composant à afficher pendant la vérification (optionnel) */
  loadingComponent?: ReactNode;
}

/**
 * Composant HOC pour protéger les pages côté serveur
 * 
 * Utilisation:
 * ```tsx
 * export default async function MyPage({ params }: { params: { subdomain?: string } }) {
 *   return (
 *     <ProtectedPage
 *       permission={{
 *         allowedRoles: ["ADMIN", "SUPERADMIN"],
 *         requireAuth: true,
 *         requireTenantMatch: true,
 *       }}
 *       subdomain={params.subdomain}
 *     >
 *       <YourPageContent />
 *     </ProtectedPage>
 *   );
 * }
 * ```
 */
export default async function ProtectedPage({
  children,
  permission,
  subdomain,
  loadingComponent,
}: ProtectedPageProps) {
  // Cette fonction vérifie les permissions et redirige/404 si nécessaire
  await protectRoute(permission, subdomain);

  // Si on arrive ici, l'accès est autorisé
  return <>{children}</>;
}
