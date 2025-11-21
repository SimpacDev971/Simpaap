"use client";
import SessionClientProvider from "@/app/SessionClientProvider";
import { signIn } from "next-auth/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function SubdomainLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const subdomain = params.subdomain as string;
  const error = searchParams.get("error");
  const [customErr, setCustomErr] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setCustomErr("");

    try {
      const res = await signIn("credentials", {
        email,
        password,
        callbackUrl: `/`,
        redirect: false,
      });

      if (res && !res.ok) {
        setCustomErr(res.error || "Erreur d'authentification");
      } else if (res?.ok) {
        // Vérifier que l'utilisateur appartient bien au tenant
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        
        if (session?.user?.tenantSlug === subdomain) {
          router.push(`/`);
        } else {
          setCustomErr("Vous n'avez pas accès à ce tenant");
          await signIn("credentials", { redirect: false, email: "", password: "" });
        }
      }
    } catch (err: any) {
      setCustomErr(err.message || "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SessionClientProvider>
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-card p-8 rounded-lg shadow-lg border border-border">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-card-foreground">
              Connexion
            </h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Connectez-vous à votre espace
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email" className="sr-only">
                  Adresse email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-input placeholder:text-muted-foreground text-foreground bg-background rounded-t-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring focus:z-10 sm:text-sm"
                  placeholder="Email"
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Mot de passe
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-input placeholder:text-muted-foreground text-foreground bg-background rounded-b-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring focus:z-10 sm:text-sm"
                  placeholder="Mot de passe"
                />
              </div>
            </div>

            {(customErr || error) && (
              <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded">
                {customErr || "Identifiants invalides"}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push(`/forgot-password`)}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Mot de passe oublié ?
              </button>
            </div>
          </form>
        </div>
      </div>
    </SessionClientProvider>
  );
}
