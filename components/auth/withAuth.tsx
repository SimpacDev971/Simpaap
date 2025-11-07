import { ComponentType } from "react";
import { RoutePermission } from "@/lib/types/auth";
import ProtectedPage from "./ProtectedPage";

/**
 * HOC (Higher Order Component) pour protéger une page avec une configuration de permission
 * 
 * Utilisation:
 * ```tsx
 * const MyPage = withAuth(
 *   async function MyPage() {
 *     return <div>Contenu protégé</div>;
 *   },
 *   {
 *     allowedRoles: ["ADMIN", "SUPERADMIN"],
 *     requireAuth: true,
 *   }
 * );
 * 
 * export default MyPage;
 * ```
 */
export function withAuth<P extends object>(
  Component: ComponentType<P>,
  permission: RoutePermission,
  getSubdomain?: (props: P) => string | undefined
) {
  return async function ProtectedComponent(props: P) {
    const subdomain = getSubdomain ? getSubdomain(props) : undefined;
    
    return (
      <ProtectedPage permission={permission} subdomain={subdomain}>
        <Component {...props} />
      </ProtectedPage>
    );
  };
}
