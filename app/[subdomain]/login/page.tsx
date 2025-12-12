"use client";
import SessionClientProvider from "@/app/SessionClientProvider";
import { BorderBeam } from "@/components/ui/border-beam";
import { SparklesCore } from '@/components/ui/shadcn-io/sparkles';
import { signIn } from "next-auth/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function SubdomainLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [customErr, setCustomErr] = useState("");

  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const subdomain = params.subdomain as string;
  const error = searchParams.get("error");

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
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8 relative">

        {/* Arrière-plan */}
        <SparklesCore
          id="tsparticlescolorful"
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={100}
          className="absolute inset-0 w-full h-full z-0"
          particleColor="#ff0000"
          speed={0.5}
        />

        {/* Carte de connexion */}
        <div className="max-w-md w-full space-y-8 bg-card p-8 rounded-lg shadow-lg border border-border relative z-10 overflow-hidden">

          <BorderBeam duration={8} size={20} />

          <h1 className="mt-2 text-center text-4xl font-extrabold text-red-500">
            {subdomain?.toUpperCase()}
          </h1>

          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-card-foreground">
              Connexion
            </h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Connectez-vous à votre espace
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">

              {/* Champ Email */}
              <div className="space-y-1">
                <label htmlFor="email" className="block text-sm font-medium text-card-foreground">
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
                  className="appearance-none relative block w-full px-3 py-2 border border-input text-foreground bg-background rounded-md placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring sm:text-sm"
                  placeholder="votre.email@exemple.com"
                />
              </div>

              {/* Champ Mot de passe */}
              <div className="space-y-1">
                <label htmlFor="password" className="block text-sm font-medium text-card-foreground">
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
                  className="appearance-none relative block w-full px-3 py-2 border border-input text-foreground bg-background rounded-md placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {(customErr || error) && (
              <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded">
                {customErr || "Identifiants invalides"}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>

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