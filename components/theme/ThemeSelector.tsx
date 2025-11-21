"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { getThemeForUser, ThemeMode } from "@/lib/theme";
import { Droplet, Palette } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ThemeSelector() {
  const { data: session, update } = useSession();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const currentMode: ThemeMode = resolvedTheme === "dark" ? "dark" : "light";

  if (!session?.user) return null;

  const currentThemeName = session.user.theme || "default";

  const themesList = ["default", "jardi", "maina", "sunset", "ocean"]; // Ajouter ici tes thèmes disponibles

  const handleThemeChange = async (themeName: string) => {
    if (themeName === currentThemeName) {
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/user/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: themeName }),
      });

      if (!response.ok) throw new Error("Erreur lors de la mise à jour du thème");

      await update();
      router.refresh();
      setOpen(false);
    } catch (error) {
      console.error("Erreur changement de thème:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Choisir un thème"
          className="relative"
        >
          <Palette className="h-5 w-5" />
          <Droplet className="h-3 w-3 absolute -top-0.5 -right-0.5 text-primary fill-primary" />
          <span className="sr-only">Choisir un thème</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Choisir un thème
          </DialogTitle>
          <DialogDescription>
            Sélectionnez un thème de couleur pour personnaliser votre interface.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 py-4">
          {themesList.map((themeName) => {
            const isSelected = themeName === currentThemeName;
            const theme = getThemeForUser(themeName);

            const primaryColorHSL =
              currentMode === "dark" ? theme.dark.primary : theme.light.primary;

            return (
              <button
                key={themeName}
                onClick={() => handleThemeChange(themeName)}
                disabled={loading}
                className={`
                  flex items-start gap-3 p-4 rounded-lg border-2 transition-all
                  hover:border-primary/50
                  ${isSelected 
                    ? "border-primary bg-primary/10 shadow-sm" 
                    : "border-border bg-background"
                  }
                  ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                <div
                  className="w-10 h-10 rounded-full flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: `hsl(${primaryColorHSL})` }}
                />
                <div className="flex-1 text-left min-w-0">
                  <div className="font-medium text-foreground">{themeName}</div>
                </div>
                {isSelected && (
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                )}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
