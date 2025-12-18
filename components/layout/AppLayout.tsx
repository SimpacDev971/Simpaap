"use client";

import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { TenantApplicationsProvider } from "@/contexts/TenantApplicationsContext";
import { useSubdomain } from "@/hooks/useSubdomain";
import { SessionRefresh } from "@/lib/auth/SessionRefresh";
import { ThemeMode, applyTheme, getThemeForUser } from "@/lib/theme";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import Footer from "./Footer";
import Navbar from "./Navbar";

interface AppLayoutProps {
  children: ReactNode;
}

const publicPages = ["/login", "/forgot-password", "/reset-password"];

// Composant interne pour gérer le thème (utilisé uniquement pour les users connectés)
function AuthenticatedLayout({ children, subdomain }: { children: ReactNode; subdomain: string | null }) {
  const { data: session, status } = useSession();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || status === "loading") return;

    const currentMode: ThemeMode = resolvedTheme === "dark" ? "dark" : "light";
    const userTheme = session?.user?.theme;
    const fallbackTheme = subdomain || "default";
    const themeName = userTheme || fallbackTheme;
    
    const themeConfig = getThemeForUser(themeName);
    applyTheme(themeConfig, currentMode);
    
    const timer = setTimeout(() => {
      document.documentElement.style.colorScheme = currentMode;
    }, 0);
    
    return () => clearTimeout(timer);
  }, [mounted, session?.user?.theme, subdomain, resolvedTheme, status]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Navbar tenantSubdomain={subdomain ?? "default"} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
        <Footer />
      </main>
    </div>
  );
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const subdomain = useSubdomain();
  const { status } = useSession();
  const isPublicPage = publicPages.includes(pathname || "");

  // Pages publiques : pas de ThemeProvider, pas de gestion de thème utilisateur
  if (isPublicPage) {
    return (
      <>
        {children}
        <Footer />
      </>
    );
  }

  // Pages privées : ThemeProvider uniquement pour les users authentifiés
  return (
    <ThemeProvider>
      <TenantApplicationsProvider>
        <SessionRefresh />
        <AuthenticatedLayout subdomain={subdomain}>
          {children}
        </AuthenticatedLayout>
      </TenantApplicationsProvider>
    </ThemeProvider>
  );
}