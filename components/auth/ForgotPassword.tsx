"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  // Détecter le subdomain depuis le pathname
  const subdomain = pathname?.match(/^\/([^\/]+)\/forgot-password/)?.[1];
  const loginUrl = subdomain ? `/${subdomain}/login` : "/login";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const { error: apiError } = await res.json();
        setError(apiError || "Erreur lors de l'envoi.");
        return;
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Erreur inattendue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-card p-8 rounded-lg shadow-lg border border-border">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-card-foreground">
            Mot de passe oublié
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Entrez votre email pour recevoir un lien de réinitialisation
          </p>
        </div>

        {success ? (
          <div className="bg-green-500/10 border border-green-500/50 text-green-700 dark:text-green-400 px-4 py-3 rounded">
            <p className="font-semibold">Email envoyé !</p>
            <p className="text-sm mt-1">
              Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.
            </p>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
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
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-input placeholder:text-muted-foreground text-foreground bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring focus:z-10 sm:text-sm"
                placeholder="email@example.com"
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Envoi..." : "Envoyer le lien"}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => router.push(loginUrl)}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Retour à la connexion
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
