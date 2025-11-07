"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import SessionClientProvider from "@/app/SessionClientProvider";
import Navbar from "./Navbar";

interface AppLayoutProps {
  children: ReactNode;
}

const publicPages = ["/login", "/forgot-password", "/reset-password"];

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const isPublicPage = publicPages.includes(pathname || "");

  if (isPublicPage) {
    return <SessionClientProvider>{children}</SessionClientProvider>;
  }

  return (
    <SessionClientProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </SessionClientProvider>
  );
}
