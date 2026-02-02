"use client";

import { PasswordStrengthIndicator, isPasswordValid } from "@/components/auth/PasswordStrengthIndicator";
import { ModeToggle } from "@/components/theme/ModeToggle";
import { ThemeSelector } from "@/components/theme/ThemeSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useTenantApplicationsContext } from "@/contexts/TenantApplicationsContext";
import { ChevronDown, Loader2, User } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

interface NavbarProps {
  tenantSubdomain: string | null;
}

export default function Navbar({ tenantSubdomain }: NavbarProps) {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { data: tenantApps, isLoading: appsLoading } = useTenantApplicationsContext();

  // Profile dialog state
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  const openProfileDialog = () => {
    setProfileName(session?.user?.name || "");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setProfileError("");
    setProfileSuccess("");
    setProfileOpen(true);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError("");
    setProfileSuccess("");

    // Validate password fields
    if (newPassword) {
      if (!currentPassword) {
        setProfileError("Le mot de passe actuel est requis");
        setProfileLoading(false);
        return;
      }
      if (!isPasswordValid(newPassword)) {
        setProfileError("Le nouveau mot de passe ne respecte pas les exigences");
        setProfileLoading(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        setProfileError("Les mots de passe ne correspondent pas");
        setProfileLoading(false);
        return;
      }
    }

    try {
      const payload: Record<string, string> = { name: profileName };
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setProfileError(data.error || "Erreur lors de la mise à jour");
        return;
      }

      setProfileSuccess("Profil mis à jour");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Refresh session to reflect name change
      await updateSession();
    } catch {
      setProfileError("Erreur inattendue");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    window.location.href = "/login";
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {session.user?.name || session.user?.email}
                      </span>
                      <Badge variant="secondary">
                        {session.user?.role}
                      </Badge>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={openProfileDialog}>
                      Paramètres du profil
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      Déconnexion
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <ThemeSelector />
                <ModeToggle />
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
      {/* Profile Settings Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Paramètres du profil</DialogTitle>
            <DialogDescription>
              Modifier votre nom ou mot de passe
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-1">Nom</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Current password */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Mot de passe actuel
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Requis pour changer le mot de passe"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            {/* New password */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Laisser vide pour ne pas changer"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              {newPassword && <PasswordStrengthIndicator password={newPassword} />}
            </div>

            {/* Confirm password */}
            {newPassword && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    confirmPassword
                      ? confirmPassword === newPassword
                        ? "border-green-500"
                        : "border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-sm text-red-500 mt-1">
                    Les mots de passe ne correspondent pas
                  </p>
                )}
              </div>
            )}

            {profileError && (
              <div className="bg-destructive/10 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-2 rounded text-sm">
                {profileError}
              </div>
            )}
            {profileSuccess && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-2 rounded text-sm">
                {profileSuccess}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setProfileOpen(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={
                  profileLoading ||
                  (!!newPassword && (!isPasswordValid(newPassword) || newPassword !== confirmPassword))
                }
              >
                {profileLoading ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </nav>
  );
}