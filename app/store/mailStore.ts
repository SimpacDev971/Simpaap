// --- /store/mailStore.ts ---

'use client';

import { create } from 'zustand';

// --- Types exportés (Inchangés) ---
export interface PDFFile {
  id: string;
  file: File;
  url: string;
  numPages: number;
  Courrier: boolean;
}
export type PrintColor = 'noir_blanc' | 'couleur';
export type PrintSide = 'recto' | 'recto_verso';
export type EnvelopeType = 'C6/5' | 'C5' | 'C4';
export type PostageType = 'recommande' | 'economique' | 'rapide';
export type PostageSpeed = 'J+1' | 'J+2' | 'J+3';

interface MailOptions {
  color: PrintColor;
  side: PrintSide;
  envelope: EnvelopeType;
  postageType: PostageType;
  postageSpeed: PostageSpeed;
}

// --- Interface du Store Corrigée ---
interface MailStore {
  sourceFile: PDFFile | null;
  annexes: PDFFile[];
  selectedPdfId: string | null;
  options: MailOptions;
  
  // Fonctions de mutation acceptant l'objet PDFFile COMPLÈTEMENT chargé
  setSourceFile: (file: PDFFile | null) => void;
  addAnnex: (file: PDFFile) => void;
  removeAnnex: (id: string) => void;
  
  // Nouvelles fonctions utilitaires
  clearAllFiles: () => void;
  
  selectPdf: (id: string | null) => void;
  setOptions: (optionsUpdate: Partial<MailOptions>) => void; // Typage corrigé
}

const DEFAULT_OPTIONS: MailOptions = {
  color: 'noir_blanc',
  side: 'recto',
  envelope: 'C6/5',
  postageType: 'economique',
  postageSpeed: 'J+3'
};

// --- Implémentation du Store Zustand ---
export const useMailStore = create<MailStore>((set, get) => ({
  sourceFile: null,
  annexes: [],
  selectedPdfId: null,
  options: DEFAULT_OPTIONS,
  
  // 1. Définition du fichier Source (Gère aussi le nettoyage de l'ancien)
  setSourceFile: (newSource) => {
    const { sourceFile } = get();
    // Nettoyer l'ancienne URL si elle existe
    if (sourceFile) {
      URL.revokeObjectURL(sourceFile.url);
    }

    set({ 
      sourceFile: newSource, 
      // Sélectionner le nouveau fichier s'il est non-null
      selectedPdfId: newSource ? newSource.id : null 
    });
  },

  // 2. Ajout d'une Annexe
  addAnnex: (newAnnex) => {
    set(state => ({ 
      annexes: [...state.annexes, newAnnex],
      // Si la source est vide, sélectionner la nouvelle annexe par défaut
      selectedPdfId: !state.sourceFile && !state.selectedPdfId ? newAnnex.id : state.selectedPdfId
    }));
  },

  // 3. Suppression d'une Annexe (avec nettoyage et gestion de la sélection)
  removeAnnex: (id) => {
    set(state => {
      const annexes = state.annexes.filter(a => a.id !== id);
      const pdfToRemove = state.annexes.find(a => a.id === id);
      
      if (pdfToRemove) {
        URL.revokeObjectURL(pdfToRemove.url); // Nettoyage de l'URL Blob
      }
      
      let selectedPdfId = state.selectedPdfId;
      // Si l'annexe supprimée était sélectionnée, sélectionner une alternative
      if (selectedPdfId === id) {
        if (state.sourceFile) {
          selectedPdfId = state.sourceFile.id;
        } else if (annexes.length > 0) {
          selectedPdfId = annexes[0].id;
        } else {
          selectedPdfId = null;
        }
      }

      return { annexes, selectedPdfId };
    });
  },
  
  // 4. Nettoyage Complet (Utile pour le reset)
  clearAllFiles: () => {
    const { sourceFile, annexes } = get();
    if (sourceFile) URL.revokeObjectURL(sourceFile.url);
    annexes.forEach(pdf => URL.revokeObjectURL(pdf.url));
    
    set({
      sourceFile: null,
      annexes: [],
      selectedPdfId: null
    });
  },

  // 5. Sélection de l'aperçu
  selectPdf: (id) => set({ selectedPdfId: id }),

  // 6. Mise à jour des Options (Typage Corrigé)
  setOptions: (optionsUpdate) => {
    set(state => ({ options: { ...state.options, ...optionsUpdate } }));
  }
}));