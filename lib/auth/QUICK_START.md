# Guide de démarrage rapide - Protection des pages

## 🚀 Utilisation rapide

### 1. Protéger une nouvelle page serveur

```tsx
// app/admin/ma-page/page.tsx
import ProtectedPage from "@/components/auth/ProtectedPage";
import { getRoutePermission } from "@/lib/auth/permissions";

export default async function MaPage() {
  const permission = getRoutePermission("/admin/ma-page") || {
    allowedRoles: ["ADMIN", "SUPERADMIN"],
    requireAuth: true,
  };

  return (
    <ProtectedPage permission={permission}>
      <div>Contenu protégé</div>
    </ProtectedPage>
  );
}
```

### 2. Ajouter la permission dans la configuration

```typescript
// lib/auth/permissions.ts
export const ROUTE_PERMISSIONS: Record<string, RoutePermission> = {
  // ... routes existantes
  
  "/admin/ma-page": {
    allowedRoles: ["ADMIN", "SUPERADMIN"],
    requireAuth: true,
    errorMessage: "Accès refusé à cette page.",
    redirectTo: "/login",
  },
};
```

### 3. Protéger un composant client

```tsx
"use client";
import ProtectedComponent from "@/components/auth/ProtectedComponent";
import { getRoutePermission } from "@/lib/auth/permissions";

export default function MonComposant() {
  const permission = getRoutePermission("/admin/ma-page") || {
    allowedRoles: ["ADMIN", "SUPERADMIN"],
    requireAuth: true,
  };

  return (
    <ProtectedComponent permission={permission}>
      <div>Contenu protégé</div>
    </ProtectedComponent>
  );
}
```

## 📝 Checklist pour une nouvelle route

- [ ] Ajouter la permission dans `lib/auth/permissions.ts`
- [ ] Utiliser `ProtectedPage` (serveur) ou `ProtectedComponent` (client)
- [ ] Utiliser `getRoutePermission()` ou `getSubdomainRoutePermission()` pour obtenir la config
- [ ] Tester avec différents rôles

## 🔍 Rôles disponibles

- `SUPERADMIN` - Accès complet
- `ADMIN` - Accès à son tenant
- `MEMBER` - Accès limité

## 📚 Documentation complète

Voir `lib/auth/README.md` pour la documentation complète.
