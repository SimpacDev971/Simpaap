# Configuration shadcn/ui et Thème par Subdomain

## ✅ Ce qui a été fait

### 1. Installation et configuration de shadcn/ui
- ✅ Configuration de `components.json`
- ✅ Installation des dépendances (`class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`)
- ✅ Configuration de Tailwind CSS avec les variables CSS de shadcn/ui
- ✅ Mise à jour de `globals.css` avec les variables CSS de thème

### 2. Système de thème dynamique
- ✅ Création de `lib/theme.ts` avec les thèmes prédéfinis (variantes clair/sombre) :
  - `default` (admin) - Couleur slate/gris
  - `jardi` - Couleur bleu
  - `maina` - Couleur vert
  - `violet` - Couleur violet
  - `orange` - Couleur orange
- ✅ `ThemeProvider` global dans `app/layout.tsx` (support du mode sombre Next Themes)
- ✅ Hook `useSubdomain` pour récupérer le subdomain côté client

### 3. Composants shadcn/ui créés
- ✅ `Button` - Boutons avec variantes (default, destructive, outline, secondary, ghost, link)
- ✅ `Card` - Cartes avec header, content, footer
- ✅ `Badge` - Badges pour afficher les rôles et statuts

### 4. Intégration
- ✅ `ThemeProvider` intégré dans `AppLayout`
- ✅ `UsersCrud` mis à jour pour utiliser `Button` et `Badge` de shadcn/ui

## 📝 Comment ajouter un nouveau thème

Pour ajouter un nouveau thème pour un subdomain, éditez `lib/theme.ts` :

```typescript
export const themes: Record<string, ThemeDefinition> = {
  // ... thèmes existants
  nouveauSubdomain: {
    light: {
      primary: "221.2 83.2% 53.3%", // HSL sans hsl()
      primaryForeground: "210 40% 98%",
      // ... autres couleurs
    },
    dark: {
      primary: "221.2 83.2% 53.3%",
      primaryForeground: "210 40% 98%",
      // ... overrides spécifiques au mode sombre
    }
  },
};
```

## 🎨 Utilisation des composants shadcn/ui

### Button
```tsx
import { Button } from "@/components/ui/button";

<Button variant="default">Cliquer</Button>
<Button variant="destructive">Supprimer</Button>
<Button variant="outline">Annuler</Button>
```

### Badge
```tsx
import { Badge } from "@/components/ui/badge";

<Badge variant="default">SUPERADMIN</Badge>
<Badge variant="secondary">ADMIN</Badge>
<Badge variant="outline">MEMBER</Badge>
```

### Card
```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Titre</CardTitle>
  </CardHeader>
  <CardContent>
    Contenu
  </CardContent>
</Card>
```

## 🔄 Prochaines étapes recommandées

1. **Créer plus de composants shadcn/ui** :
   - `Dialog` pour les modales
   - `Table` pour les tableaux
   - `Input`, `Label`, `Select` pour les formulaires
   - `Alert` pour les messages

2. **Remplacer les composants existants** :
   - Remplacer les boutons personnalisés par `Button`
   - Remplacer les modales par `Dialog`
   - Remplacer les tableaux par `Table`

3. **Améliorer le système de thème** :
   - Permettre de stocker les thèmes dans la base de données
   - Créer une interface d'administration pour gérer les thèmes
   - Ajouter une UI pour prévisualiser les variantes clair/sombre

## 📚 Documentation

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
- Les composants sont dans `components/ui/`
- Les thèmes sont dans `lib/theme.ts`
