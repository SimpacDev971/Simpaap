"use client";

import { ModeToggle } from "@/components/theme/ModeToggle";
import { ThemeSelector } from "@/components/theme/ThemeSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useTenantApplicationsContext } from "@/contexts/TenantApplicationsContext";
import { ChevronDown, Loader2 } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

interface NavbarProps {
  tenantSubdomain: string | null;
}

export default function Navbar({ tenantSubdomain }: NavbarProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { data: tenantApps, isLoading: appsLoading } = useTenantApplicationsContext();
  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  const handleApplicationClick = (url: string | null) => {
    if (url) {
      const params = new URLSearchParams({ flux: url });
      router.push(`/simpaap?${params.toString()}`);
    }
  };

  const displayTenantName = tenantSubdomain?.toUpperCase() === "DEFAULT"
  ? "SIMPAAP"
  : tenantSubdomain?.toUpperCase() || "SIMPAAP";


  return (
    <nav className="border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Button
              variant="link"
              onClick={() => router.push("/")}
              className="px-0 py-0 h-auto text-2xl font-bold"
            >
              {displayTenantName}
            </Button>
            {session && (
              <div className="ml-10 flex items-center space-x-4">
                {/* Applications Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex items-center gap-1">
                      Applications
                      {appsLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {appsLoading ? (
                      <DropdownMenuItem disabled>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Chargement...
                      </DropdownMenuItem>
                    ) : tenantApps && tenantApps.categories.length > 0 ? (
                      tenantApps.categories.map((category) => (
                        <DropdownMenuSub key={category.id}>
                          <DropdownMenuSubTrigger>
                            {category.nom}
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {tenantApps.byCategory[category.id]?.map((app) => (
                              <DropdownMenuItem
                                key={app.id}
                                onClick={() => handleApplicationClick(app.url)}
                                className="cursor-pointer"
                              >
                                {app.nom}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      ))
                    ) : (
                      <DropdownMenuItem disabled>
                        Aucune application disponible
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant={pathname?.startsWith("/admin") ? "secondary" : "ghost"}
                  onClick={() => router.push("/admin")}
                  size="sm"
                >
                  Administration
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {status === "loading" ? (
              <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            ) : session ? (
              <>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">
                    {session.user?.name || session.user?.email}
                  </span>
                  <Badge variant="secondary">
                    {session.user?.role}
                  </Badge>
                </div>
                <ThemeSelector />
                <ModeToggle />
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  size="sm"
                >
                  Déconnexion
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="link"
                  onClick={() => router.push("/forgot-password")}
                  size="sm"
                >
                  Mot de passe oublié ?
                </Button>
                <Button
                  variant="default"
                  onClick={() => router.push("/login")}
                  size="sm"
                >
                  Connexion
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}