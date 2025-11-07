"use client";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import SessionClientProvider from "../SessionClientProvider";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const params = useSearchParams();
  const router = useRouter();
  const error = params.get("error");
  const [customErr, setCustomErr] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setCustomErr("");
    setShowCreate(false);
    const res = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/admin",
      redirect: false,
    });
    setLoading(false);
    if (res && !res.ok && res.error?.includes("Utilisateur introuvable")) {
      setCustomErr("Aucun compte trouvé pour cet email.");
      setShowCreate(true);
    } else if (res && !res.ok) {
      setCustomErr(res.error || "Erreur d'authentification");
    } else if (res?.ok) {
      router.push("/admin");
    }
  }

  return (
    <SessionClientProvider>
      <main className="flex items-center justify-center min-h-screen">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-8 rounded shadow max-w-sm bg-white">
          <h2 className="text-xl font-bold">Connexion</h2>
          <input
            className="border p-2 rounded"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="border p-2 rounded"
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
          {(customErr || error) && <div className="text-red-600">{customErr || "Identifiants invalides"}</div>}
        </form>
      </main>
    </SessionClientProvider>
  );
}
