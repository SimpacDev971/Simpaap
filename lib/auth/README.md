# Système de Protection des Pages

Ce système fournit une solution centralisée et réutilisable pour protéger les pages et les composants de votre application Next.js avec un système de rôles et de permissions.

## 📋 Table des matières

- [Architecture](#architecture)
- [Configuration des permissions](#configuration-des-permissions)
- [Utilisation](#utilisation)
- [Composants disponibles](#composants-disponibles)
- [Utilitaires](#utilitaires)
- [Exemples](#exemples)

## 🏗️ Architecture

Le système est organisé en plusieurs modules :

```
lib/
├── types/
│   └── auth.ts              # Types TypeScript pour l'authentification
├── auth/
│   ├── permissions.ts      # Configuration centralisée des permissions
│   ├── utils.ts            # Utilitaires pour vérifier les permissions
│   └── README.md           # Cette documentation
components/
└── auth/
    ├── ProtectedPage.tsx   # Composant pour protéger les pages serveur
    ├── ProtectedComponent.tsx  # Composant pour protéger les composants client
    └── withAuth.tsx        # HOC pour protéger les pages
```

## ⚙️ Configuration des permissions

Toutes les permissions sont centralisées dans `lib/auth/permissions.ts`. C'est ici que vous définissez quels rôles peuvent accéder à chaque route.

### Structure d'une permission

```typescript
{
  allowedRoles: ["SUPERADMIN", "ADMIN"],  // Rôles autorisés
  requireAuth: true,                       // Nécessite une authentification
  requireTenantMatch: true,               // Nécessite que l'utilisateur appartienne au tenant
  errorMessage: "Message d'erreur",       // Message personnalisé
  redirectTo: "/login"                    // Redirection si accès refusé
}
```

### Ajouter une nouvelle route protégée

Pour ajouter une nouvelle route, ajoutez simplement son chemin dans `ROUTE_PERMISSIONS` :

```typescript
export const ROUTE_PERMISSIONS: Record<string, RoutePermission> = {
  // ... routes existantes
  
  "/ma-nouvelle-route": {
    allowedRoles: ["ADMIN", "MEMBER"],
    requireAuth: true,
    errorMessage: "Accès refusé à cette page.",
    redirectTo: "/login",
  },
  
  "/[subdomain]/ma-route": {
    allowedRoles: ["ADMIN"],
    requireAuth: true,
    requireTenantMatch: true,
    errorMessage: "Vous n'avez pas accès à cette page.",
  },
};
```

## 🚀 Utilisation

### Protection d'une page serveur (Server Component)

```tsx
import ProtectedPage from "@/components/auth/ProtectedPage";
import { getRoutePermission } from "@/lib/auth/permissions";

export default async function MyPage() {
  const permission = getRoutePermission("/admin") || {
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

### Protection d'une page avec subdomain

```tsx
import ProtectedPage from "@/components/auth/ProtectedPage";
import { getSubdomainRoutePermission } from "@/lib/auth/permissions";

export default async function SubdomainPage({ 
  params 
}: { 
  params: { subdomain: string } 
}) {
  const permission = getSubdomainRoutePermission("/admin", params.subdomain) || {
    allowedRoles: ["SUPERADMIN"],
    requireAuth: true,
    requireTenantMatch: false,
  };

  return (
    <ProtectedPage permission={permission} subdomain={params.subdomain}>
      <div>Contenu protégé</div>
    </ProtectedPage>
  );
}
```

### Protection d'un composant client (Client Component)

```tsx
"use client";
import ProtectedComponent from "@/components/auth/ProtectedComponent";
import { getRoutePermission } from "@/lib/auth/permissions";

export default function MyComponent() {
  const permission = getRoutePermission("/admin") || {
    allowedRoles: ["ADMIN", "SUPERADMIN"],
    requireAuth: true,
  };

  return (
    <ProtectedComponent 
      permission={permission}
      loadingComponent={<div>Chargement...</div>}
      fallbackComponent={<div>Accès refusé</div>}
    >
      <div>Contenu protégé</div>
    </ProtectedComponent>
  );
}
```

### Utilisation du HOC `withAuth`

```tsx
import { withAuth } from "@/components/auth/withAuth";

const MyPage = withAuth(
  async function MyPage() {
    return <div>Contenu protégé</div>;
  },
  {
    allowedRoles: ["ADMIN", "SUPERADMIN"],
    requireAuth: true,
  }
);

export default MyPage;
```

## 🧩 Composants disponibles

### `ProtectedPage`

Composant serveur pour protéger les pages Next.js.

**Props :**
- `permission: RoutePermission` - Configuration de permission
- `subdomain?: string` - Subdomain actuel (pour les routes multi-tenant)
- `children: ReactNode` - Contenu à protéger
- `loadingComponent?: ReactNode` - Composant à afficher pendant la vérification

**Comportement :**
- Redirige vers `/login` si l'utilisateur n'est pas authentifié
- Retourne 404 si l'utilisateur n'a pas les permissions nécessaires

### `ProtectedComponent`

Composant client pour protéger les composants React.

**Props :**
- `permission: RoutePermission` - Configuration de permission
- `subdomain?: string` - Subdomain actuel
- `children: ReactNode` - Contenu à protéger
- `loadingComponent?: ReactNode` - Composant à afficher pendant le chargement
- `fallbackComponent?: ReactNode` - Composant à afficher si l'accès est refusé

**Comportement :**
- Affiche le `loadingComponent` pendant la vérification
- Affiche le `fallbackComponent` si l'accès est refusé
- Redirige vers `redirectTo` si défini dans la permission

### `withAuth`

HOC (Higher Order Component) pour protéger une page.

**Paramètres :**
- `Component: ComponentType<P>` - Le composant à protéger
- `permission: RoutePermission` - Configuration de permission
- `getSubdomain?: (props: P) => string | undefined` - Fonction pour extraire le subdomain

## 🛠️ Utilitaires

### `getRoutePermission(routePath: string)`

Obtient la configuration de permission pour une route donnée.

```typescript
const permission = getRoutePermission("/admin");
```

### `getSubdomainRoutePermission(routePath: string, subdomain?: string)`

Obtient la configuration de permission pour une route avec subdomain.

```typescript
const permission = getSubdomainRoutePermission("/admin/users", "mon-tenant");
```

### `getAuthSession()`

Obtient la session utilisateur côté serveur.

```typescript
const session = await getAuthSession();
if (session) {
  console.log(session.role); // "ADMIN" | "MEMBER" | "SUPERADMIN"
}
```

### `hasRole(role: UserRole)`

Vérifie si l'utilisateur a un rôle spécifique.

```typescript
const isAdmin = await hasRole("ADMIN");
```

### `hasAnyRole(roles: UserRole[])`

Vérifie si l'utilisateur a l'un des rôles spécifiés.

```typescript
const canAccess = await hasAnyRole(["ADMIN", "SUPERADMIN"]);
```

### `belongsToTenant(subdomain: string)`

Vérifie si l'utilisateur appartient au tenant spécifié.

```typescript
const belongs = await belongsToTenant("mon-tenant");
```

### `protectRoute(permission: RoutePermission, subdomain?: string)`

Protège une route en vérifiant les permissions. Redirige ou retourne 404 si l'accès est refusé.

```typescript
const session = await protectRoute(permission, subdomain);
// Si on arrive ici, l'accès est autorisé
```

## 📝 Exemples

### Exemple 1 : Page admin simple

```tsx
// app/admin/dashboard/page.tsx
import ProtectedPage from "@/components/auth/ProtectedPage";
import { getRoutePermission } from "@/lib/auth/permissions";

export default async function DashboardPage() {
  const permission = getRoutePermission("/admin/dashboard") || {
    allowedRoles: ["ADMIN", "SUPERADMIN"],
    requireAuth: true,
  };

  return (
    <ProtectedPage permission={permission}>
      <div>
        <h1>Dashboard</h1>
        {/* Contenu de la page */}
      </div>
    </ProtectedPage>
  );
}
```

### Exemple 2 : Page avec données

```tsx
// app/admin/users/page.tsx
import ProtectedPage from "@/components/auth/ProtectedPage";
import { getRoutePermission } from "@/lib/auth/permissions";
import prisma from "@/lib/prisma";

export default async function UsersPage() {
  const permission = getRoutePermission("/admin/users") || {
    allowedRoles: ["SUPERADMIN"],
    requireAuth: true,
  };

  // Les données sont chargées après la vérification des permissions
  const users = await prisma.user.findMany();

  return (
    <ProtectedPage permission={permission}>
      <div>
        <h1>Utilisateurs</h1>
        <ul>
          {users.map(user => (
            <li key={user.id}>{user.email}</li>
          ))}
        </ul>
      </div>
    </ProtectedPage>
  );
}
```

### Exemple 3 : Composant client protégé

```tsx
// app/components/AdminPanel.tsx
"use client";
import ProtectedComponent from "@/components/auth/ProtectedComponent";
import { getRoutePermission } from "@/lib/auth/permissions";

export default function AdminPanel() {
  const permission = getRoutePermission("/admin") || {
    allowedRoles: ["ADMIN", "SUPERADMIN"],
    requireAuth: true,
  };

  return (
    <ProtectedComponent 
      permission={permission}
      loadingComponent={<div>Vérification des permissions...</div>}
      fallbackComponent={<div>Vous n'avez pas accès à ce panneau.</div>}
    >
      <div>
        <h2>Panneau d'administration</h2>
        {/* Contenu du panneau */}
      </div>
    </ProtectedComponent>
  );
}
```

## 🔒 Rôles disponibles

- **SUPERADMIN** : Accès complet à tous les tenants
- **ADMIN** : Accès à son tenant et gestion des membres
- **MEMBER** : Accès limité, membre simple du tenant

## 💡 Bonnes pratiques

1. **Centralisez les permissions** : Utilisez toujours `lib/auth/permissions.ts` pour définir les permissions
2. **Utilisez les fonctions utilitaires** : Préférez `getRoutePermission()` plutôt que de définir les permissions inline
3. **Protégez côté serveur** : Utilisez `ProtectedPage` pour les pages serveur (meilleure sécurité)
4. **Protégez côté client** : Utilisez `ProtectedComponent` uniquement pour les composants client nécessitant une protection UI
5. **Messages d'erreur clairs** : Définissez des `errorMessage` explicites pour faciliter le débogage

## 🐛 Dépannage

### L'utilisateur est redirigé vers /login même s'il est connecté

Vérifiez que :
- La session contient bien les propriétés `role` et `tenantSlug`
- Les types NextAuth sont correctement étendus dans `types/next-auth.d.ts`

### L'accès est refusé alors que l'utilisateur a le bon rôle

Vérifiez que :
- Le rôle dans la session correspond exactement à celui dans `allowedRoles`
- `requireTenantMatch` est correctement configuré pour les routes avec subdomain

### Erreur TypeScript sur `session.user.role`

Assurez-vous que le fichier `types/next-auth.d.ts` est bien présent et que TypeScript le reconnaît.
