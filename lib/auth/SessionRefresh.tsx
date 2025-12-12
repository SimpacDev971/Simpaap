"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Composant qui force le rafraîchissement de la page quand la session change
 * À placer dans AppLayout pour gérer automatiquement les changements de session
 */
export function SessionRefresh() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const prevStatusRef = useRef(status);

  useEffect(() => {
    // Détecter quand on passe de "unauthenticated" à "authenticated"
    if (prevStatusRef.current === "unauthenticated" && status === "authenticated") {
      // L'utilisateur vient de se connecter, forcer un refresh
      router.refresh();
    }
    
    // Détecter quand on passe de "authenticated" à "unauthenticated"
    if (prevStatusRef.current === "authenticated" && status === "unauthenticated") {
      // L'utilisateur vient de se déconnecter
      router.push("/login");
    }

    prevStatusRef.current = status;
  }, [status, router]);

  return null; // Ce composant ne rend rien
}