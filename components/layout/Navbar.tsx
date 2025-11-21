"use client";

import { ModeToggle } from "@/components/theme/ModeToggle";
import { ThemeSelector } from "@/components/theme/ThemeSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOut, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

export default function Navbar({ tenantSubdomain }: { tenantSubdomain: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <nav>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Button
              variant="link"
              onClick={() => router.push("/")}
              className="px-0 py-0 h-auto text-2xl font-bold"
            >
              {tenantSubdomain.toLocaleUpperCase()}
            </Button>
            {session && (
              <div className="ml-10 flex items-center space-x-4">
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
            {session ? (
              <>
                <div className="flex items-center space-x-2">
                  <span>
                    {session.user?.name || session.user?.email}
                  </span>
                  <Badge variant="secondary">
                    {session.user?.role}
                  </Badge>
                </div>
                <ModeToggle />
                <ThemeSelector />
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
