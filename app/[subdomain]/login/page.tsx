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
        callbackUrl: `/${subdomain}/admin`,
        redirect: false,
      });

      if (res && !res.ok) {
        setCustomErr(res.error || "Erreur d'authentification");
      } else if (res?.ok) {
        // Vérifier que l'utilisateur appartient bien au tenant
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        
        if (session?.user?.tenantSlug === subdomain || session?.user?.role === "SUPERADMIN") {
          router.push(`/${subdomain}/admin`);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              Connexion - {subdomain}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
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
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
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
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Mot de passe"
                />
              </div>
            </div>

            {(customErr || error) && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
                {customErr || "Identifiants invalides"}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push(`/${subdomain}/forgot-password`)}
                className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
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
