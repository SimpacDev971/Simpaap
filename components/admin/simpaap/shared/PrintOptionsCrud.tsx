"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import DeletePrintOption from "./DeletePrintOption";
import PrintOptionForm, { PrintOptionData } from "./PrintOptionForm";

interface PrintOptionsCrudProps {
  title: string;
  apiEndpoint: string; // e.g., "/api/print-options/colors"
  hasDescription?: boolean;
}

export default function PrintOptionsCrud({
  title,
  apiEndpoint,
  hasDescription = false,
}: PrintOptionsCrudProps) {
  const [options, setOptions] = useState<PrintOptionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingOption, setEditingOption] = useState<PrintOptionData | null>(null);
  const [deletingOption, setDeletingOption] = useState<PrintOptionData | null>(null);

  const fetchOptions = async () => {
    setLoading(true);
    setError("");

    try {
      // Fetch global options (no tenantId needed)
      const res = await fetch(apiEndpoint);
      if (!res.ok) throw new Error("Erreur lors du chargement");
      const data = await res.json();
      setOptions(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, [apiEndpoint]);

  const handleSuccess = () => {
    fetchOptions();
    setShowCreate(false);
    setEditingOption(null);
    setDeletingOption(null);
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
        <h3 className="text-lg font-semibold">{title}</h3>
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

      {/* Options Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">Ordre</th>
              <th className="text-left p-3 font-medium">Valeur</th>
              <th className="text-left p-3 font-medium">Libellé</th>
              {hasDescription && (
                <th className="text-left p-3 font-medium">Description</th>
              )}
              <th className="text-left p-3 font-medium">Statut</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {options.length === 0 ? (
              <tr>
                <td
                  colSpan={hasDescription ? 6 : 5}
                  className="text-center py-8 text-muted-foreground"
                >
                  Aucune option configurée
                </td>
              </tr>
            ) : (
              options.map((option) => (
                <tr key={option.id} className="border-t hover:bg-muted/50">
                  <td className="p-3">{option.sortOrder}</td>
                  <td className="p-3 font-mono text-sm">{option.value}</td>
                  <td className="p-3">{option.label}</td>
                  {hasDescription && (
                    <td className="p-3 text-sm text-muted-foreground">
                      {option.description || "-"}
                    </td>
                  )}
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        option.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {option.isActive ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setEditingOption(option)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => setDeletingOption(option)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une option</DialogTitle>
          </DialogHeader>
          <PrintOptionForm
            apiEndpoint={apiEndpoint}
            hasDescription={hasDescription}
            onSuccess={handleSuccess}
            onCancel={() => setShowCreate(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingOption}
        onOpenChange={(open) => !open && setEditingOption(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'option</DialogTitle>
          </DialogHeader>
          {editingOption && (
            <PrintOptionForm
              initialData={editingOption}
              apiEndpoint={apiEndpoint}
              hasDescription={hasDescription}
              onSuccess={handleSuccess}
              onCancel={() => setEditingOption(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={!!deletingOption}
        onOpenChange={(open) => !open && setDeletingOption(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer l'option</DialogTitle>
          </DialogHeader>
          {deletingOption && (
            <DeletePrintOption
              optionId={deletingOption.id!}
              optionLabel={deletingOption.label}
              apiEndpoint={apiEndpoint}
              onSuccess={handleSuccess}
              onCancel={() => setDeletingOption(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
