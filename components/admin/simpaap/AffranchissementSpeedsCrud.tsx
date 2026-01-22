"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Speed {
  id: number;
  value: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
}

interface SpeedFormData {
  label: string;
  isActive: boolean;
}

const defaultFormData: SpeedFormData = {
  label: "",
  isActive: true,
};

// Generate a unique code from label
function generateCode(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9\s]/g, "") // Remove special chars
    .replace(/\s+/g, "_") // Replace spaces with underscore
    .substring(0, 50); // Limit length
}

export default function AffranchissementSpeedsCrud() {
  const [speeds, setSpeeds] = useState<Speed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingSpeed, setEditingSpeed] = useState<Speed | null>(null);
  const [deletingSpeed, setDeletingSpeed] = useState<Speed | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/print-options/speeds");
      if (!res.ok) throw new Error("Erreur lors du chargement");
      const data = await res.json();
      setSpeeds(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSuccess = () => {
    fetchData();
    setShowCreate(false);
    setEditingSpeed(null);
    setDeletingSpeed(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Vitesses d'affranchissement</h3>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Ajouter
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Définissez les différentes vitesses d'envoi (ex: Ecopli, Lettre Verte, Lettre Prioritaire).
        Chaque tarif d'affranchissement peut ensuite être lié à une vitesse.
      </p>

      {error && (
        <div className="bg-destructive/20 border border-destructive text-destructive px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">Libellé</th>
              <th className="text-left p-3 font-medium">Statut</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {speeds.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-8 text-muted-foreground">
                  Aucune vitesse configurée
                </td>
              </tr>
            ) : (
              speeds.map((speed) => (
                <tr key={speed.id} className="border-t hover:bg-muted/50 transition-colors">
                  <td className="p-3 font-medium">{speed.label}</td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        speed.isActive
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {speed.isActive ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setEditingSpeed(speed)}
                      title="Modifier"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => setDeletingSpeed(speed)}
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter une vitesse</DialogTitle>
          </DialogHeader>
          <SpeedForm
            onSuccess={handleSuccess}
            onCancel={() => setShowCreate(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingSpeed}
        onOpenChange={(open) => !open && setEditingSpeed(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier la vitesse</DialogTitle>
          </DialogHeader>
          {editingSpeed && (
            <SpeedForm
              initialData={editingSpeed}
              onSuccess={handleSuccess}
              onCancel={() => setEditingSpeed(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={!!deletingSpeed}
        onOpenChange={(open) => !open && setDeletingSpeed(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la vitesse</DialogTitle>
          </DialogHeader>
          {deletingSpeed && (
            <DeleteSpeed
              speed={deletingSpeed}
              onSuccess={handleSuccess}
              onCancel={() => setDeletingSpeed(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// SpeedForm Component
function SpeedForm({
  initialData,
  onSuccess,
  onCancel,
}: {
  initialData?: Speed;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<SpeedFormData>(
    initialData
      ? {
          label: initialData.label,
          isActive: initialData.isActive,
        }
      : defaultFormData
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!initialData;

  const handleChange = (field: keyof SpeedFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.label.trim()) {
      setError("Le libellé est requis");
      setLoading(false);
      return;
    }

    try {
      const url = isEditing
        ? `/api/print-options/speeds/${initialData.id}`
        : "/api/print-options/speeds";

      // Auto-generate value from label (only for new items)
      const value = isEditing ? initialData.value : generateCode(formData.label);

      // Auto-generate sortOrder (get next available order)
      let sortOrder = initialData?.sortOrder ?? 0;
      if (!isEditing) {
        // Fetch existing items to determine next sortOrder
        const listRes = await fetch("/api/print-options/speeds");
        if (listRes.ok) {
          const items = await listRes.json();
          sortOrder = items.length > 0 ? Math.max(...items.map((i: Speed) => i.sortOrder)) + 1 : 0;
        }
      }

      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          value,
          sortOrder,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la sauvegarde");
      }

      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-destructive/20 border border-destructive text-destructive px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="label">Libellé *</Label>
        <Input
          id="label"
          value={formData.label}
          onChange={(e) => handleChange("label", e.target.value)}
          placeholder="Ex: Ecopli, Lettre Verte, Lettre Prioritaire"
          required
        />
        <p className="text-xs text-muted-foreground">
          Le nom affiché pour cette vitesse d'envoi
        </p>
      </div>

      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-0.5">
          <Label htmlFor="isActive">Statut</Label>
          <p className="text-xs text-muted-foreground">
            Rendre cette vitesse disponible
          </p>
        </div>
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => handleChange("isActive", checked)}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enregistrement...
            </>
          ) : isEditing ? (
            "Mettre à jour"
          ) : (
            "Créer"
          )}
        </Button>
        <Button type="button" onClick={onCancel} variant="outline">
          Annuler
        </Button>
      </div>
    </form>
  );
}

// DeleteSpeed Component
function DeleteSpeed({
  speed,
  onSuccess,
  onCancel,
}: {
  speed: Speed;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const handleDelete = async () => {
    if (confirmation !== "SUPPRIMER") return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/print-options/speeds/${speed.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la suppression");
      }

      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-destructive/20 border border-destructive text-destructive px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Voulez-vous vraiment supprimer la vitesse <strong>{speed.label}</strong> ({speed.value}) ?
      </p>

      <p className="text-sm text-destructive">
        Cette action est irréversible. Tapez <strong>SUPPRIMER</strong> pour confirmer.
      </p>

      <Input
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        placeholder="Tapez SUPPRIMER"
      />

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={loading || confirmation !== "SUPPRIMER"}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Supprimer
        </Button>
      </div>
    </div>
  );
}
