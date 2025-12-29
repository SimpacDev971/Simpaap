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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Enveloppe {
  id: number;
  fullName: string;
  taille: string;
}

interface Speed {
  id: number;
  value: string;
  label: string;
  isActive: boolean;
}

interface Affranchissement {
  id: number;
  fullName: string;
  name: string;
  env_taille: string;
  speedId: number | null;
  pdsMin: number;
  pdsMax: number;
  price: number;
  isActive: boolean;
  enveloppe?: {
    fullName: string;
    taille: string;
  };
  speed?: {
    id: number;
    value: string;
    label: string;
  };
}

interface AffranchissementFormData {
  fullName: string;
  name: string;
  env_taille: string;
  speedId: string;
  pdsMin: string;
  pdsMax: string;
  price: string;
  isActive: boolean;
}

const defaultFormData: AffranchissementFormData = {
  fullName: "",
  name: "",
  env_taille: "",
  speedId: "",
  pdsMin: "",
  pdsMax: "",
  price: "",
  isActive: true,
};

export default function AffranchissementsCrud() {
  const [affranchissements, setAffranchissements] = useState<Affranchissement[]>([]);
  const [enveloppes, setEnveloppes] = useState<Enveloppe[]>([]);
  const [speeds, setSpeeds] = useState<Speed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingAffranchissement, setEditingAffranchissement] = useState<Affranchissement | null>(null);
  const [deletingAffranchissement, setDeletingAffranchissement] = useState<Affranchissement | null>(null);
  const [filterEnvTaille, setFilterEnvTaille] = useState<string>("all");
  const [filterSpeedId, setFilterSpeedId] = useState<string>("all");

  const fetchData = async () => {
    setLoading(true);
    setError("");

    try {
      const [affRes, envRes, speedRes] = await Promise.all([
        fetch("/api/print-options/affranchissements"),
        fetch("/api/print-options/enveloppes"),
        fetch("/api/print-options/speeds"),
      ]);

      if (!affRes.ok || !envRes.ok || !speedRes.ok) throw new Error("Erreur lors du chargement");

      const [affData, envData, speedData] = await Promise.all([
        affRes.json(),
        envRes.json(),
        speedRes.json(),
      ]);

      setAffranchissements(affData);
      setEnveloppes(envData);
      setSpeeds(speedData);
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
    setEditingAffranchissement(null);
    setDeletingAffranchissement(null);
  };

  const filteredAffranchissements = affranchissements.filter((a) => {
    const matchEnv = filterEnvTaille === "all" || a.env_taille === filterEnvTaille;
    const matchSpeed = filterSpeedId === "all" ||
      (filterSpeedId === "none" ? a.speedId === null : a.speedId === parseInt(filterSpeedId));
    return matchEnv && matchSpeed;
  });

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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h3 className="text-lg font-semibold">Affranchissements</h3>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Enveloppe:</Label>
            <Select value={filterEnvTaille} onValueChange={setFilterEnvTaille}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Toutes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {enveloppes.map((env) => (
                  <SelectItem key={env.id} value={env.taille}>
                    {env.taille} - {env.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Vitesse:</Label>
            <Select value={filterSpeedId} onValueChange={setFilterSpeedId}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Toutes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="none">Non assignée</SelectItem>
                {speeds.map((speed) => (
                  <SelectItem key={speed.id} value={String(speed.id)}>
                    {speed.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Ajouter
          </Button>
        </div>
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
              <th className="text-left p-3 font-medium">Code</th>
              <th className="text-left p-3 font-medium">Nom complet</th>
              <th className="text-left p-3 font-medium">Enveloppe</th>
              <th className="text-left p-3 font-medium">Vitesse</th>
              <th className="text-left p-3 font-medium">Poids (g)</th>
              <th className="text-left p-3 font-medium">Prix</th>
              <th className="text-left p-3 font-medium">Statut</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAffranchissements.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-muted-foreground">
                  Aucun affranchissement configuré
                </td>
              </tr>
            ) : (
              filteredAffranchissements.map((aff) => (
                <tr key={aff.id} className="border-t hover:bg-muted/50">
                  <td className="p-3 font-mono text-sm">{aff.name}</td>
                  <td className="p-3">{aff.fullName}</td>
                  <td className="p-3 text-sm">
                    <span className="font-mono">{aff.env_taille}</span>
                    {aff.enveloppe && (
                      <span className="text-muted-foreground ml-1">
                        ({aff.enveloppe.fullName})
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-sm">
                    {aff.speed ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {aff.speed.label}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="p-3 text-sm">
                    {aff.pdsMin}g - {aff.pdsMax}g
                  </td>
                  <td className="p-3 font-medium">{(Math.floor(Number(aff.price) * 100) / 100).toFixed(2)}€</td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        aff.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {aff.isActive ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setEditingAffranchissement(aff)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => setDeletingAffranchissement(aff)}
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
            <DialogTitle>Ajouter un affranchissement</DialogTitle>
          </DialogHeader>
          <AffranchissementForm
            enveloppes={enveloppes}
            speeds={speeds}
            onSuccess={handleSuccess}
            onCancel={() => setShowCreate(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingAffranchissement}
        onOpenChange={(open) => !open && setEditingAffranchissement(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier l'affranchissement</DialogTitle>
          </DialogHeader>
          {editingAffranchissement && (
            <AffranchissementForm
              initialData={editingAffranchissement}
              enveloppes={enveloppes}
              speeds={speeds}
              onSuccess={handleSuccess}
              onCancel={() => setEditingAffranchissement(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={!!deletingAffranchissement}
        onOpenChange={(open) => !open && setDeletingAffranchissement(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l'affranchissement</DialogTitle>
          </DialogHeader>
          {deletingAffranchissement && (
            <DeleteAffranchissement
              affranchissement={deletingAffranchissement}
              onSuccess={handleSuccess}
              onCancel={() => setDeletingAffranchissement(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// AffranchissementForm Component
function AffranchissementForm({
  initialData,
  enveloppes,
  speeds,
  onSuccess,
  onCancel,
}: {
  initialData?: Affranchissement;
  enveloppes: Enveloppe[];
  speeds: Speed[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<AffranchissementFormData>(
    initialData
      ? {
          fullName: initialData.fullName,
          name: initialData.name,
          env_taille: initialData.env_taille,
          speedId: initialData.speedId ? String(initialData.speedId) : "",
          pdsMin: String(initialData.pdsMin),
          pdsMax: String(initialData.pdsMax),
          price: String(initialData.price),
          isActive: initialData.isActive,
        }
      : defaultFormData
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!initialData;

  const handleChange = (field: keyof AffranchissementFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = isEditing
        ? `/api/print-options/affranchissements/${initialData.id}`
        : "/api/print-options/affranchissements";

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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Code *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Ex: G4, ECOPLI"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="env_taille">Enveloppe *</Label>
          <Select
            value={formData.env_taille}
            onValueChange={(value) => handleChange("env_taille", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent>
              {enveloppes.map((env) => (
                <SelectItem key={env.id} value={env.taille}>
                  {env.taille} - {env.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nom complet *</Label>
          <Input
            id="fullName"
            value={formData.fullName}
            onChange={(e) => handleChange("fullName", e.target.value)}
            placeholder="Ex: ECOPLI Standard"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="speedId">Vitesse</Label>
          <Select
            value={formData.speedId}
            onValueChange={(value) => handleChange("speedId", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent>
              {speeds.filter(s => s.isActive).map((speed) => (
                <SelectItem key={speed.id} value={String(speed.id)}>
                  {speed.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="pdsMin">Poids min (g) *</Label>
          <Input
            id="pdsMin"
            type="number"
            value={formData.pdsMin}
            onChange={(e) => handleChange("pdsMin", e.target.value)}
            placeholder="0"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pdsMax">Poids max (g) *</Label>
          <Input
            id="pdsMax"
            type="number"
            value={formData.pdsMax}
            onChange={(e) => handleChange("pdsMax", e.target.value)}
            placeholder="20"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Prix (€) *</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => handleChange("price", e.target.value)}
            placeholder="1.20"
            required
          />
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

// DeleteAffranchissement Component
function DeleteAffranchissement({
  affranchissement,
  onSuccess,
  onCancel,
}: {
  affranchissement: Affranchissement;
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
      const res = await fetch(`/api/print-options/affranchissements/${affranchissement.id}`, {
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
        Voulez-vous vraiment supprimer l'affranchissement <strong>{affranchissement.fullName}</strong> ({affranchissement.name}) ?
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
