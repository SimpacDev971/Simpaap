// --- /components/AnnexList/AnnexList.tsx ---

'use client';

import React from 'react';

import { PDFFile } from '@/app/store/mailStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ListOrdered, Trash2 } from 'lucide-react';

interface AnnexListProps {
  files: PDFFile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

const AnnexList: React.FC<AnnexListProps> = ({ files, selectedId, onSelect, onRemove }) => (
  // Le code d'implémentation JSX pour afficher la liste des fichiers n'était pas présent, 
  // mais la signature des props indique son rôle.
  <div className="space-y-2">
    <div className="flex items-center text-sm font-semibold text-slate-600">
      <ListOrdered size={16} className="mr-2" />
      Annexes ({files.length})
    </div>
    {files.map((file, index) => (
      <Card 
        key={file.id} 
        className={`p-3 flex items-center justify-between text-sm transition-colors ${selectedId === file.id ? 'border-primary ring-2 ring-primary/20' : 'hover:bg-slate-50'}`}
        onClick={() => onSelect(file.id)}
      >
        <span className="truncate">
          {index + 1}. {file.file.name} ({file.numPages} pages)
        </span>
        <Button variant="ghost" size="icon" onClick={(e) => {
          e.stopPropagation(); // Empêche la sélection lors de la suppression
          onRemove(file.id);
        }}>
          <Trash2 size={16} className="text-red-500" />
        </Button>
      </Card>
    ))}
    {files.length === 0 && <p className="text-sm text-slate-400 italic">Aucune annexe ajoutée.</p>}
  </div>
);

export default AnnexList;