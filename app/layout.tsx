import SessionClientProvider from "@/app/SessionClientProvider";
import AppLayout from "@/components/layout/AppLayout";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Simpaap - Editique",
  description: "Simplifiez l'envoi de vos courrier",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SessionClientProvider>
    <html lang="fr" suppressHydrationWarning>
      <body className={`bg-background text-foreground min-h-screen`}>
        <ThemeProvider>
          <AppLayout>{children}</AppLayout>
        </ThemeProvider>
      </body>
    </html>
  </SessionClientProvider>
  );
}
