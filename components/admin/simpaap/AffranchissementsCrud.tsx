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
import { ArrowUpDown, FileUp, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  speedId: number | null;
  pdsMin: number;
  pdsMax: number;
  price: number;
  isActive: boolean;
  speed?: {
    id: number;
    value: string;
    label: string;
  };
}

interface AffranchissementFormData {
  fullName: string;
  speedId: string;
  pdsMin: string;
  pdsMax: string;
  price: string;
  isActive: boolean;
}

const defaultFormData: AffranchissementFormData = {
  fullName: "",
  speedId: "",
  pdsMin: "",
  pdsMax: "",
  price: "",
  isActive: true,
};

// Generate a unique code from fullName
function generateCode(fullName: string): string {
  return fullName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9\s]/g, "") // Remove special chars
    .replace(/\s+/g, "_") // Replace spaces with underscore
    .substring(0, 50); // Limit length
}

export default function AffranchissementsCrud() {
  const [affranchissements, setAffranchissements] = useState<Affranchissement[]>([]);
  const [speeds, setSpeeds] = useState<Speed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingAffranchissement, setEditingAffranchissement] = useState<Affranchissement | null>(null);
  const [deletingAffranchissement, setDeletingAffranchissement] = useState<Affranchissement | null>(null);
  const [filterSpeedId, setFilterSpeedId] = useState<string>("all");
  const [showImport, setShowImport] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>("fullName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    setError("");

    try {
      const [affRes, speedRes] = await Promise.all([
        fetch("/api/print-options/affranchissements"),
        fetch("/api/print-options/speeds"),
      ]);

      if (!affRes.ok || !speedRes.ok) throw new Error("Erreur lors du chargement");

      const [affData, speedData] = await Promise.all([
        affRes.json(),
        speedRes.json(),
      ]);

      setAffranchissements(affData);
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

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedAffranchissements = affranchissements
    .filter((a) => {
      const matchSpeed = filterSpeedId === "all" ||
        (filterSpeedId === "none" ? a.speedId === null : a.speedId === parseInt(filterSpeedId));
      return matchSpeed;
    })
    .sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortColumn) {
        case "fullName":
          aVal = a.fullName.toLowerCase();
          bVal = b.fullName.toLowerCase();
          break;
        case "speed":
          aVal = a.speed?.label.toLowerCase() || "";
          bVal = b.speed?.label.toLowerCase() || "";
          break;
        case "pdsMin":
          aVal = a.pdsMin;
          bVal = b.pdsMin;
          break;
        case "price":
          aVal = a.price;
          bVal = b.price;
          break;
        case "isActive":
          aVal = a.isActive ? 1 : 0;
          bVal = b.isActive ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
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
        <h3 className="text-lg font-semibold">Prix affranchissements</h3>
        <div className="flex items-center gap-4 flex-wrap">
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
          <Button onClick={() => setShowImport(true)} size="sm" variant="outline">
            <FileUp className="mr-2 h-4 w-4" />
            Importer CSV
          </Button>
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
              <th className="text-left p-3 font-medium">
                <button
                  onClick={() => handleSort("fullName")}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  Nom complet
                  <ArrowUpDown className={`h-4 w-4 ${sortColumn === "fullName" ? "text-foreground" : "text-muted-foreground"}`} />
                </button>
              </th>
              <th className="text-left p-3 font-medium">
                <button
                  onClick={() => handleSort("speed")}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  Affranchissement
                  <ArrowUpDown className={`h-4 w-4 ${sortColumn === "speed" ? "text-foreground" : "text-muted-foreground"}`} />
                </button>
              </th>
              <th className="text-left p-3 font-medium">
                <button
                  onClick={() => handleSort("pdsMin")}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  Tranche (g)
                  <ArrowUpDown className={`h-4 w-4 ${sortColumn === "pdsMin" ? "text-foreground" : "text-muted-foreground"}`} />
                </button>
              </th>
              <th className="text-left p-3 font-medium">
                <button
                  onClick={() => handleSort("price")}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  Prix
                  <ArrowUpDown className={`h-4 w-4 ${sortColumn === "price" ? "text-foreground" : "text-muted-foreground"}`} />
                </button>
              </th>
              <th className="text-left p-3 font-medium">
                <button
                  onClick={() => handleSort("isActive")}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  Statut
                  <ArrowUpDown className={`h-4 w-4 ${sortColumn === "isActive" ? "text-foreground" : "text-muted-foreground"}`} />
                </button>
              </th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedAffranchissements.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">
                  Aucun affranchissement configuré
                </td>
              </tr>
            ) : (
              filteredAndSortedAffranchissements.map((aff) => (
                <tr key={aff.id} className="border-t hover:bg-muted/50 transition-colors">
                  <td className="p-3 font-medium">{aff.fullName}</td>
                  <td className="p-3 text-sm">
                    {aff.speed ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
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
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        aff.isActive
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
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
                      title="Modifier"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => setDeletingAffranchissement(aff)}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajouter un affranchissement</DialogTitle>
          </DialogHeader>
          <AffranchissementForm
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

      {/* Import Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importer les prix depuis un CSV</DialogTitle>
          </DialogHeader>
          <ImportCSV
            onSuccess={() => {
              handleSuccess();
              setShowImport(false);
            }}
            onCancel={() => setShowImport(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// AffranchissementForm Component
function AffranchissementForm({
  initialData,
  speeds,
  onSuccess,
  onCancel,
}: {
  initialData?: Affranchissement;
  speeds: Speed[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<AffranchissementFormData>(
    initialData
      ? {
          fullName: initialData.fullName,
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

    if (!formData.fullName.trim()) {
      setError("Le nom complet est requis");
      setLoading(false);
      return;
    }

    try {
      const url = isEditing
        ? `/api/print-options/affranchissements/${initialData.id}`
        : "/api/print-options/affranchissements";

      // Auto-generate name from fullName (only for new items)
      const name = isEditing ? initialData.name : generateCode(formData.fullName);

      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          name,
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
        <Label htmlFor="fullName">Nom complet *</Label>
        <Input
          id="fullName"
          value={formData.fullName}
          onChange={(e) => handleChange("fullName", e.target.value)}
          placeholder="Ex: ECOPLI Standard"
          required
        />
        <p className="text-xs text-muted-foreground">
          Le nom affiché pour cet affranchissement
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="speedId">Vitesse</Label>
        <Select
          value={formData.speedId}
          onValueChange={(value) => handleChange("speedId", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Aucune (optionnel)" />
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

      <div className="border rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-medium">Tranche de poids et prix</h4>
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
      </div>

      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-0.5">
          <Label htmlFor="isActive">Statut</Label>
          <p className="text-xs text-muted-foreground">
            Rendre cet affranchissement disponible
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

// ImportCSV Component
function ImportCSV({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string>("");
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError("Le fichier doit être un CSV");
        return;
      }
      setFile(selectedFile);
      setError("");

      // Read file to show preview
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n').slice(0, 6); // Show first 6 lines
        setPreview(lines.join('\n'));
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError("Veuillez sélectionner un fichier");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Read CSV file
      const reader = new FileReader();
      reader.onload = async (event) => {
        const csvText = event.target?.result as string;

        // Send to API
        const res = await fetch("/api/print-options/affranchissements/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csvData: csvText }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Erreur lors de l'import");
        }

        const result = await res.json();
        console.log("Import result:", result);
        setImportResult(result);
        setLoading(false);

        // Auto-close and refresh after showing results for a moment
        setTimeout(() => {
          onSuccess();
        }, 3000);
      };

      reader.onerror = () => {
        setError("Erreur lors de la lecture du fichier");
        setLoading(false);
      };

      reader.readAsText(file);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
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

      <div className="space-y-2">
        <Label>Format du fichier CSV</Label>
        <p className="text-xs text-muted-foreground">
          Le fichier doit contenir les colonnes suivantes séparées par des points-virgules (;):
        </p>
        <pre className="text-xs bg-muted p-2 rounded">
          Afranchissement;fullname;tranche;prix
        </pre>
        <p className="text-xs text-muted-foreground">
          Exemple: ECOPLI;ECOPLI (J+4);0-20;1,25
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="csv-file">Fichier CSV</Label>
        <Input
          id="csv-file"
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
        />
      </div>

      {preview && (
        <div className="space-y-2">
          <Label>Aperçu (premières lignes)</Label>
          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-32">
            {preview}
          </pre>
        </div>
      )}

      {!importResult ? (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded text-sm">
          <p className="font-medium mb-1">ℹ️ Mode de fonctionnement</p>
          <ul className="text-xs space-y-1 list-disc list-inside">
            <li><strong>Mise à jour intelligente:</strong> Les prix existants sont mis à jour (pas de suppression)</li>
            <li><strong>Préservation des réglages:</strong> Le statut actif/inactif est conservé</li>
            <li><strong>Création automatique:</strong> Les nouveaux prix sont créés automatiquement</li>
            <li><strong>Liaison des vitesses:</strong> Les vitesses d'affranchissement sont liées automatiquement</li>
          </ul>
        </div>
      ) : (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-green-500 dark:bg-green-600 flex items-center justify-center">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-green-900 dark:text-green-100">Import réussi!</p>
              <p className="text-sm text-green-700 dark:text-green-300">{importResult.message}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{importResult.updated || 0}</p>
              <p className="text-xs text-muted-foreground">Mis à jour</p>
            </div>
            <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{importResult.created || 0}</p>
              <p className="text-xs text-muted-foreground">Créés</p>
            </div>
            <div className="text-center p-2 bg-white dark:bg-gray-800 rounded">
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{importResult.skipped || 0}</p>
              <p className="text-xs text-muted-foreground">Ignorés</p>
            </div>
          </div>
        </div>
      )}

      {!importResult && (
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleImport}
            disabled={loading || !file}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Import en cours...
              </>
            ) : (
              <>
                <FileUp className="mr-2 h-4 w-4" />
                Importer
              </>
            )}
          </Button>
          <Button type="button" onClick={onCancel} variant="outline">
            Annuler
          </Button>
        </div>
      )}
    </div>
  );
}
