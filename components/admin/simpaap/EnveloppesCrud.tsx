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
import { invalidatePrintOptionsClientCache } from "@/contexts/PrintOptionsContext";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Enveloppe {
  id: number;
  fullName: string;
  taille: string;
  pdsMax: number;
  poids: number;
  addrX: number;
  addrY: number;
  addrH: number;
  addrL: number;
  isActive: boolean;
}

interface EnveloppeFormData {
  fullName: string;
  taille: string;
  pdsMax: string;
  poids: string;
  addrX: string;
  addrY: string;
  addrH: string;
  addrL: string;
  isActive: boolean;
}

const defaultFormData: EnveloppeFormData = {
  fullName: "",
  taille: "",
  pdsMax: "",
  poids: "5",
  addrX: "0",
  addrY: "0",
  addrH: "0",
  addrL: "0",
  isActive: true,
};

export default function EnveloppesCrud() {
  const [enveloppes, setEnveloppes] = useState<Enveloppe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingEnveloppe, setEditingEnveloppe] = useState<Enveloppe | null>(null);
  const [deletingEnveloppe, setDeletingEnveloppe] = useState<Enveloppe | null>(null);

  const fetchEnveloppes = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/print-options/enveloppes");
      if (!res.ok) throw new Error("Erreur lors du chargement");
      const data = await res.json();
      setEnveloppes(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnveloppes();
  }, []);

  const handleSuccess = () => {
    fetchEnveloppes();
    invalidatePrintOptionsClientCache(); // Clear localStorage cache so printApp gets fresh data
    setShowCreate(false);
    setEditingEnveloppe(null);
    setDeletingEnveloppe(null);
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
        <h3 className="text-lg font-semibold">Enveloppes</h3>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Ajouter
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/20 border border-destructive text-destructive px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">Taille</th>
              <th className="text-left p-3 font-medium">Nom complet</th>
              <th className="text-left p-3 font-medium">Poids env. (g)</th>
              <th className="text-left p-3 font-medium">Poids max (g)</th>
              <th className="text-left p-3 font-medium">Position adresse</th>
              <th className="text-left p-3 font-medium">Statut</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {enveloppes.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted-foreground">
                  Aucune enveloppe configurée
                </td>
              </tr>
            ) : (
              enveloppes.map((enveloppe) => (
                <tr key={enveloppe.id} className="border-t hover:bg-muted/50">
                  <td className="p-3 font-mono text-sm">{enveloppe.taille}</td>
                  <td className="p-3">{enveloppe.fullName}</td>
                  <td className="p-3">{enveloppe.poids}g</td>
                  <td className="p-3">{enveloppe.pdsMax}g</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    X:{enveloppe.addrX} Y:{enveloppe.addrY} H:{enveloppe.addrH} L:{enveloppe.addrL}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        enveloppe.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {enveloppe.isActive ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setEditingEnveloppe(enveloppe)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => setDeletingEnveloppe(enveloppe)}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajouter une enveloppe</DialogTitle>
          </DialogHeader>
          <EnveloppeForm
            onSuccess={handleSuccess}
            onCancel={() => setShowCreate(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingEnveloppe}
        onOpenChange={(open) => !open && setEditingEnveloppe(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier l'enveloppe</DialogTitle>
          </DialogHeader>
          {editingEnveloppe && (
            <EnveloppeForm
              initialData={editingEnveloppe}
              onSuccess={handleSuccess}
              onCancel={() => setEditingEnveloppe(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={!!deletingEnveloppe}
        onOpenChange={(open) => !open && setDeletingEnveloppe(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l'enveloppe</DialogTitle>
          </DialogHeader>
          {deletingEnveloppe && (
            <DeleteEnveloppe
              enveloppe={deletingEnveloppe}
              onSuccess={handleSuccess}
              onCancel={() => setDeletingEnveloppe(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// EnveloppeForm Component
function EnveloppeForm({
  initialData,
  onSuccess,
  onCancel,
}: {
  initialData?: Enveloppe;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<EnveloppeFormData>(
    initialData
      ? {
          fullName: initialData.fullName,
          taille: initialData.taille,
          pdsMax: String(initialData.pdsMax),
          poids: String(initialData.poids),
          addrX: String(initialData.addrX),
          addrY: String(initialData.addrY),
          addrH: String(initialData.addrH),
          addrL: String(initialData.addrL),
          isActive: initialData.isActive,
        }
      : defaultFormData
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!initialData;

  const handleChange = (field: keyof EnveloppeFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = isEditing
        ? `/api/print-options/enveloppes/${initialData.id}`
        : "/api/print-options/enveloppes";

      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="taille">Code taille *</Label>
          <Input
            id="taille"
            value={formData.taille}
            onChange={(e) => handleChange("taille", e.target.value)}
            placeholder="Ex: PL, C5, C4"
            required
            disabled={isEditing}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="poids">Poids enveloppe (g) *</Label>
          <Input
            id="poids"
            type="number"
            value={formData.poids}
            onChange={(e) => handleChange("poids", e.target.value)}
            placeholder="Ex: 5"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pdsMax">Poids max total (g) *</Label>
          <Input
            id="pdsMax"
            type="number"
            value={formData.pdsMax}
            onChange={(e) => handleChange("pdsMax", e.target.value)}
            placeholder="Ex: 100"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fullName">Nom complet *</Label>
        <Input
          id="fullName"
          value={formData.fullName}
          onChange={(e) => handleChange("fullName", e.target.value)}
          placeholder="Ex: Grande Enveloppe G4"
          required
        />
      </div>

      <div className="border rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-medium">Position de l'adresse (mm)</h4>
        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label htmlFor="addrX" className="text-xs">X</Label>
            <Input
              id="addrX"
              type="number"
              step="0.1"
              value={formData.addrX}
              onChange={(e) => handleChange("addrX", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="addrY" className="text-xs">Y</Label>
            <Input
              id="addrY"
              type="number"
              step="0.1"
              value={formData.addrY}
              onChange={(e) => handleChange("addrY", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="addrH" className="text-xs">Hauteur</Label>
            <Input
              id="addrH"
              type="number"
              step="0.1"
              value={formData.addrH}
              onChange={(e) => handleChange("addrH", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="addrL" className="text-xs">Largeur</Label>
            <Input
              id="addrL"
              type="number"
              step="0.1"
              value={formData.addrL}
              onChange={(e) => handleChange("addrL", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => handleChange("isActive", checked)}
        />
        <Label htmlFor="isActive">Actif</Label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Modifier" : "Créer"}
        </Button>
      </div>
    </form>
  );
}

// DeleteEnveloppe Component
function DeleteEnveloppe({
  enveloppe,
  onSuccess,
  onCancel,
}: {
  enveloppe: Enveloppe;
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
      const res = await fetch(`/api/print-options/enveloppes/${enveloppe.id}`, {
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
        Voulez-vous vraiment supprimer l'enveloppe <strong>{enveloppe.fullName}</strong> ({enveloppe.taille}) ?
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
