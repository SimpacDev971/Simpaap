// ============================
// TYPES
// ============================

export type ThemeMode = "light" | "dark";

export interface ThemePalette {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  input: string;
  ring: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
}

export interface ThemeDefinition {
  light: ThemePalette;
  dark: ThemePalette;
}

export interface ThemeMeta {
  name: string;
  label: string;
  description: string;
}

export interface FullTheme extends ThemeDefinition, ThemeMeta {}


// ============================
// BASE PALETTES
// ============================

const baseLight: ThemePalette = {
  primary: "222.2 47.4% 11.2%",
  primaryForeground: "210 40% 98%",
  secondary: "210 40% 96.1%",
  secondaryForeground: "222.2 47.4% 11.2%",
  accent: "210 40% 96.1%",
  accentForeground: "222.2 47.4% 11.2%",
  destructive: "0 84.2% 60.2%",
  destructiveForeground: "210 40% 98%",
  muted: "210 40% 96.1%",
  mutedForeground: "215.4 16.3% 46.9%",
  border: "214.3 31.8% 91.4%",
  input: "214.3 31.8% 91.4%",
  ring: "222.2 84% 4.9%",
  background: "0 0% 100%",
  foreground: "222.2 47.4% 11.2%",
  card: "0 0% 100%",
  cardForeground: "222.2 47.4% 11.2%",
  popover: "0 0% 100%",
  popoverForeground: "222.2 47.4% 11.2%",
};

const baseDark: ThemePalette = {
  primary: "210 40% 98%",
  primaryForeground: "222.2 47.4% 11.2%",
  secondary: "217.2 32.6% 17.5%",
  secondaryForeground: "210 40% 98%",
  accent: "217.2 32.6% 17.5%",
  accentForeground: "210 40% 98%",
  destructive: "0 62.8% 30.6%",
  destructiveForeground: "210 40% 98%",
  muted: "217.2 32.6% 17.5%",
  mutedForeground: "215 20.2% 65.1%",
  border: "217.2 32.6% 17.5%",
  input: "217.2 32.6% 17.5%",
  ring: "212.7 26.8% 83.9%",
  background: "222.2 47.4% 11.2%",
  foreground: "210 40% 98%",
  card: "222.2 47.4% 11.2%",
  cardForeground: "210 40% 98%",
  popover: "222.2 47.4% 11.2%",
  popoverForeground: "210 40% 98%",
};


// ============================
// CREATE THEME
// ============================

const createTheme = (defs: {
  name: string;
  label: string;
  description: string;
  light?: Partial<ThemePalette>;
  dark?: Partial<ThemePalette>;
}): FullTheme => ({
  name: defs.name,
  label: defs.label,
  description: defs.description,

  light: { ...baseLight, ...(defs.light || {}) },
  dark: { ...baseDark, ...(defs.dark || {}) },
});


// ============================
// THEMES DEFINITIONS
// ============================

export const themes: Record<string, FullTheme> = {
  default: createTheme({
    name: "default",
    label: "Par défaut",
    description: "Thème classique avec des tons gris",
  }),
  jardi: createTheme({
    name: "jardi",
    label: "Jardi",
    description: "Thème dynamique avec des tons orange",
    light: {
      primary: "30 100% 50%",
      primaryForeground: "0 0% 100%",
      accent: "35 90% 60%",
      accentForeground: "0 0% 10%",
      ring: "30 100% 50%",
    },
    dark: {
      primary: "30 90% 40%",
      primaryForeground: "0 0% 100%",
      accent: "35 80% 50%",
      accentForeground: "0 0% 90%",
      ring: "30 90% 40%",
    },
  }),
  maina: createTheme({
    name: "maina",
    label: "Maina",
    description: "Thème naturel vert",
    light: {
      primary: "142.1 76.2% 36.3%",
      primaryForeground: "355.7 100% 97.3%",
      accent: "142.1 70.6% 45.3%",
      accentForeground: "144.9 80.4% 10%",
      ring: "142.1 76.2% 36.3%",
    },
    dark: {
      primary: "142.1 76.2% 36.3%",
      primaryForeground: "210 40% 98%",
      accent: "142.1 70.6% 45.3%",
      accentForeground: "210 40% 98%",
      ring: "142.1 76.2% 36.3%",
    },
  }),
  sunset: createTheme({
    name: "sunset",
    label: "Sunset",
    description: "Thème chaleureux orange/rose",
    light: {
      primary: "14 90% 60%",
      primaryForeground: "0 0% 100%",
      accent: "20 80% 70%",
      accentForeground: "0 0% 15%",
      ring: "14 90% 60%",
    },
    dark: {
      primary: "14 80% 50%",
      primaryForeground: "0 0% 100%",
      accent: "20 70% 60%",
      accentForeground: "0 0% 90%",
      ring: "14 80% 50%",
    },
  }),
  ocean: createTheme({
    name: "ocean",
    label: "Ocean",
    description: "Thème frais bleu/cyan",
    light: {
      primary: "200 70% 50%",
      primaryForeground: "0 0% 100%",
      accent: "190 60% 60%",
      accentForeground: "0 0% 10%",
      ring: "200 70% 50%",
    },
    dark: {
      primary: "200 60% 40%",
      primaryForeground: "0 0% 100%",
      accent: "190 50% 50%",
      accentForeground: "0 0% 90%",
      ring: "200 60% 40%",
    }
  })
}


// ============================
// GETTERS
// ============================

export function getThemeForUser(themeName?: string | null): FullTheme {
  if (!themeName) return themes.default;
  return themes[themeName.toLowerCase()] || themes.default;
}

export function getAvailableThemes() {
  return Object.values(themes).map((t) => ({
    name: t.name,
    label: t.label,
    description: t.description,
  }));
}


// ============================
// APPLY CSS VARIABLES
// ============================

export function applyTheme(theme: FullTheme, mode: ThemeMode = "light") {
  if (typeof document === "undefined") return;

  const palette = theme[mode];
  const root = document.documentElement;

  const cssMapping: Record<keyof ThemePalette, string> = {
    primary: "primary",
    primaryForeground: "primary-foreground",
    secondary: "secondary",
    secondaryForeground: "secondary-foreground",
    accent: "accent",
    accentForeground: "accent-foreground",
    destructive: "destructive",
    destructiveForeground: "destructive-foreground",
    muted: "muted",
    mutedForeground: "muted-foreground",
    border: "border",
    input: "input",
    ring: "ring",
    background: "background",
    foreground: "foreground",
    card: "card",
    cardForeground: "card-foreground",
    popover: "popover",
    popoverForeground: "popover-foreground",
  };

  Object.entries(palette).forEach(([key, value]) => {
    const cssKey = cssMapping[key as keyof ThemePalette];
    root.style.setProperty(`--${cssKey}`, value);
  });
}
