"use client";

import SessionClientProvider from "@/app/SessionClientProvider";
import { useSubdomain } from "@/hooks/useSubdomain";
import { ThemeMode, applyTheme, getThemeForUser } from "@/lib/theme";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect } from "react";
import Footer from "./Footer";
import Navbar from "./Navbar";

interface AppLayoutProps {
  children: ReactNode;
}

const publicPages = ["/", "/login", "/forgot-password", "/reset-password"];

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const subdomain = useSubdomain();
  const { data: session } = useSession();
  const { resolvedTheme } = useTheme();
  const isPublicPage = publicPages.includes(pathname || "");
  const currentMode: ThemeMode = resolvedTheme === "dark" ? "dark" : "light";

  useEffect(() => {
    // Utiliser le thème de l'utilisateur depuis la session, sinon fallback sur subdomain
    const userTheme = session?.user?.theme;
    const fallbackTheme = subdomain || "default";
    const themeName = userTheme || fallbackTheme;
    const theme = getThemeForUser(themeName);
    applyTheme(theme, currentMode);
  
  }, [session?.user?.theme, subdomain, currentMode]);
  
  if (isPublicPage) {
    return (
      <SessionClientProvider>
        {children}
        <Footer/>
      </SessionClientProvider>
    );
  }

  return (
    <SessionClientProvider>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
          <Navbar tenantSubdomain={subdomain}/>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          <Footer/>
        </main>
      </div>
    </SessionClientProvider>
  );
}
