'use client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePrintOptionsContext } from "@/contexts/PrintOptionsContext";
import {
  Check,
  FileText,
  Layers,
  ListOrdered,
  Plus,
  Printer,
  Trash2,
  Truck,
  Upload,
  ShoppingBasket
} from 'lucide-react';
import { useSession } from "next-auth/react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pdfjs } from "react-pdf";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import PdfViewer from "../PdfViewer";

// --- DÉBUT DE LA CORRECTION CRITIQUE (Web Worker PDF.js) ---
// Utilisation de la version de pdfjs incluse dans react-pdf pour éviter les conflits de version
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
// --- FIN DE LA CORRECTION CRITIQUE ---

// --- Types & Constants ---

type ActiveFileArea = 'source' | 'annexes'; // Pour la gestion de l'aperçu

interface PrintColor {
  id: number;
  value: string;
  label: string;
  isActive: boolean;
}

interface PrintSide {
  id: number;
  value: string;
  label: string;
  isActive: boolean;
}

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

interface Speed {
  id: number;
  value: string;
  label: string;
  isActive: boolean;
}

interface PostageRate {
  id: number;
  fullName: string;
  name: string;
  price: number;
  pdsMin: number;
  pdsMax: number;
  speedId?: number | null;
  speed?: {
    id: number;
    value: string;
    label: string;
  } | null;
}

interface PDFFile {
  id: string;
  file: File;
  url: string;
  numPages: number;
  Courrier :  boolean
}

const WEIGHT_PER_SHEET_GRAMS = 5; // 1 sheet (feuille) = 5 grams

// --- Main Application Component ---

export default function PrintApp() {
  // Session pour récupérer les informations utilisateur
  const { data: session } = useSession();

  // Print options from cached context
  const { data: printOptions, isLoading: loadingOptions } = usePrintOptionsContext();

  // NOUVEAUX ÉTATS
  const [sourceFile, setSourceFile] = useState<PDFFile | null>(null);
  const [annexes, setAnnexes] = useState<PDFFile[]>([]);
  // Ancien selectedPdfId pour la prévisualisation
  const [selectedPdfId, setSelectedPdfId] = useState<string | null>(null);
  // Nouvel état pour savoir si on regarde le source ou une annexe
  const [activePreviewArea, setActivePreviewArea] = useState<ActiveFileArea>('source');

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [currentNumPages, setCurrentNumPages] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState<'upload' | 'config' | 'success'>('config');

  // Selected print options (initialized from cached context)
  const [selectedColor, setSelectedColor] = useState<PrintColor | null>(null);
  const [selectedSide, setSelectedSide] = useState<PrintSide | null>(null);
  const [selectedEnveloppe, setSelectedEnveloppe] = useState<Enveloppe | null>(null);
  const [selectedSpeed, setSelectedSpeed] = useState<Speed | null>(null);
  const [separation, setSeparation] = useState<number>(1); // Pages par destinataire (publipostage)
  const [calculatedRate, setCalculatedRate] = useState<PostageRate | null>(null);
  const [loadingRate, setLoadingRate] = useState(false);

  // Derived state from cached print options
  const colors = printOptions?.colors || [];
  const sides = printOptions?.sides || [];
  const enveloppes = printOptions?.enveloppes || [];
  const speeds = printOptions?.speeds || [];

  const sourceFileInputRef = useRef<HTMLInputElement>(null);
  const annexeFileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const dragItem = useRef<number | null>(null); // Index de l'élément que l'on glisse

  // Calcul du nombre total de pages
  const totalPages = useMemo(() => {
    const sourcePages = sourceFile?.numPages || 0;
    const annexePages = annexes.reduce((sum, pdf) => sum + pdf.numPages, 0);
    return sourcePages + annexePages;
  }, [sourceFile, annexes]);

  // Calcul du nombre de courriers et du poids
  const totalLetters = useMemo(() => {
    if (!sourceFile) return 0;
    return Math.ceil(sourceFile.numPages / separation);
  }, [sourceFile, separation]);

  const annexePagesTotal = useMemo(() => {
    return annexes.reduce((sum, pdf) => sum + pdf.numPages, 0);
  }, [annexes]);

  const pagesPerEnvelope = useMemo(() => {
    return separation + annexePagesTotal;
  }, [separation, annexePagesTotal]);

  // Calculate sheets based on print side (recto vs recto-verso)
  // Recto: 1 page = 1 sheet
  // Recto-verso: 2 pages = 1 sheet (rounded up if odd number of pages)
  const sheetsPerEnvelope = useMemo(() => {
    const isRectoVerso = selectedSide?.value === 'recto_verso';
    if (isRectoVerso) {
      // Recto-verso: divide by 2, round up for odd pages
      return Math.ceil(pagesPerEnvelope / 2);
    }
    // Recto: 1 page = 1 sheet
    return pagesPerEnvelope;
  }, [pagesPerEnvelope, selectedSide]);

  // Weight of sheets only (used to validate envelope capacity)
  const sheetsWeight = useMemo(() => {
    return sheetsPerEnvelope * WEIGHT_PER_SHEET_GRAMS;
  }, [sheetsPerEnvelope]);

  // Total weight = sheets weight + envelope weight (used for postage calculation)
  const weightPerEnvelope = useMemo(() => {
    const envelopeWeight = selectedEnveloppe?.poids || 0;
    return sheetsWeight + envelopeWeight;
  }, [sheetsWeight, selectedEnveloppe]);

  const totalPostageCost = useMemo(() => {
    if (!calculatedRate) return 0;
    return totalLetters * calculatedRate.price;
  }, [totalLetters, calculatedRate]);

  // Filter envelopes that can carry the current weight of sheets
  const availableEnveloppes = useMemo(() => {
    // Only show envelopes that can carry the sheets weight
    return enveloppes.filter(env => {
      return env.pdsMax >= sheetsWeight;
    });
  }, [enveloppes, sheetsWeight]);

  // Obtenir le PDF sélectionné pour l'APERÇU
  const selectedPdf = useMemo(() => {
    if (activePreviewArea === 'source') {
      return sourceFile;
    }
    // Si activePreviewArea est 'annexes', on utilise selectedPdfId pour trouver l'annexe
    return annexes.find(pdf => pdf.id === selectedPdfId) || null;
  }, [sourceFile, annexes, selectedPdfId, activePreviewArea]);

  // --- useEffect pour la synchronisation de l'aperçu ---
  
  // 1. Initialisation de l'aperçu au chargement/changement de source
  useEffect(() => {
    // Si la source est chargée, l'afficher par défaut
    if (sourceFile && activePreviewArea !== 'source') {
      setActivePreviewArea('source');
      setSelectedPdfId(sourceFile.id);
    }
  }, [sourceFile, activePreviewArea]);

  // 2. Mise à jour de l'état local du nombre de pages
  useEffect(() => {
    setCurrentNumPages(selectedPdf?.numPages || 0);
  }, [selectedPdf]);

  // 3. Reset de la page courante lors du changement de document
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPdfId, activePreviewArea]);

  // 4. Initialize selected options when print options are loaded from cache
  useEffect(() => {
    if (printOptions) {
      // Initialize with first option if not already set
      if (printOptions.colors.length > 0 && !selectedColor) {
        setSelectedColor(printOptions.colors[0]);
      }
      if (printOptions.sides.length > 0 && !selectedSide) {
        setSelectedSide(printOptions.sides[0]);
      }
      if (printOptions.enveloppes.length > 0 && !selectedEnveloppe) {
        setSelectedEnveloppe(printOptions.enveloppes[0]);
      }
      if (printOptions.speeds.length > 0 && !selectedSpeed) {
        setSelectedSpeed(printOptions.speeds[0]);
      }
    }
  }, [printOptions, selectedColor, selectedSide, selectedEnveloppe, selectedSpeed]);

  // 5. Calculate postage when relevant inputs change
  useEffect(() => {
    const calculatePostage = async () => {
      if (weightPerEnvelope <= 0) {
        setCalculatedRate(null);
        return;
      }

      setLoadingRate(true);
      try {
        const res = await fetch('/api/print-options/calculate-postage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weightGrams: weightPerEnvelope,
            speedId: selectedSpeed?.id || null,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setCalculatedRate(data.rate);
        }
      } catch (error) {
        console.error('Erreur lors du calcul du tarif:', error);
        setCalculatedRate(null);
      } finally {
        setLoadingRate(false);
      }
    };

    calculatePostage();
  }, [weightPerEnvelope, selectedSpeed]);

  // --- Gestion des fichiers ---

  // Fonction utilitaire pour lire le nombre de pages via pdfjs
  const getPdfPages = async (file: File, url: string): Promise<number> => {
    try {
      const loadedPdf = await pdfjs.getDocument(url).promise;
      return loadedPdf.numPages;
    } catch (error) {
      console.error("Erreur lors de la lecture des pages du PDF:", file.name, error);
      return 0;
    }
  };

  // 1. Gestion du Document Source (Mono-fichier)
  const processSourceFile = useCallback(async (selectedFile: File) => {
    if (selectedFile.type !== 'application/pdf') {
      alert(`${selectedFile.name}: Seuls les fichiers PDF sont acceptés.`);
      return;
    }
    
    // Nettoyage de l'ancien fichier s'il existe
    if (sourceFile) URL.revokeObjectURL(sourceFile.url);

    const id = `source_${Date.now()}`;
    const url = URL.createObjectURL(selectedFile);
    const numPages = await getPdfPages(selectedFile, url);

    const newSourceFile: PDFFile = { id, file: selectedFile, url, numPages,Courrier:true };

    setSourceFile(newSourceFile);
    setSelectedPdfId(newSourceFile.id);
    setActivePreviewArea('source');
    // Par défaut: toutes les pages pour 1 destinataire
    setSeparation(numPages);

  }, [sourceFile]);

  const handleSourceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSourceFile(e.target.files[0]);
    }
  };
  
  const handleRemoveSource = () => {
    if (sourceFile) {
      URL.revokeObjectURL(sourceFile.url);
      setSourceFile(null);
      // Après suppression, si des annexes existent, sélectionner la première annexe
      if (annexes.length > 0) {
        //setSelectedPdfId(annexes[0].id);
        //setActivePreviewArea('annexes');
      } else {
        setSelectedPdfId(null);
        setActivePreviewArea('source'); // Retour à l'état vide
      }
    }
  };

  // 2. Gestion des Annexes (Multi-fichiers)
  const processAnnexes = useCallback(async (selectedFiles: FileList) => {
    const filePromises = Array.from(selectedFiles).map(async (file) => {
      if (file.type !== 'application/pdf') return null;

      const id = `annexe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const url = URL.createObjectURL(file);
      const numPages = await getPdfPages(file, url);
      
      return { id, file, url, numPages,Courrier:false };
    });

    const newPdfFiles = (await Promise.all(filePromises)).filter((f): f is PDFFile => f !== null);

    if (newPdfFiles.length === 0) return;
    
    setAnnexes(prev => [...prev, ...newPdfFiles]);

    // Sélectionner le premier élément si le Source n'est pas sélectionné
    if (!sourceFile && !selectedPdfId) {
      setSelectedPdfId(newPdfFiles[0].id);
      //setActivePreviewArea('annexes');
    }
  }, [sourceFile, selectedPdfId]);

  const handleAnnexesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processAnnexes(e.target.files);
    }
  };

  const handleRemoveAnnexe = (id: string) => {
    setAnnexes(prev => {
      const pdfToRemove = prev.find(pdf => pdf.id === id);
      if (pdfToRemove) URL.revokeObjectURL(pdfToRemove.url);
      
      const remaining = prev.filter(pdf => pdf.id !== id);
      
      // Gérer la sélection si l'annexe supprimée était sélectionnée
      if (selectedPdfId === id) {
        if (sourceFile) {
          setSelectedPdfId(sourceFile.id);
          setActivePreviewArea('source');
        } else if (remaining.length > 0) {
          setSelectedPdfId(remaining[0].id);
          //setActivePreviewArea('annexes');
        } else {
          setSelectedPdfId(null);
          setActivePreviewArea('source');
        }
      }
      return remaining;
    });
  };

  // 3. Logique de Drag-and-Drop pour les Annexes
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    dragItem.current = index;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", e.currentTarget.outerHTML);
    // Masquer l'élément en cours de glissement
    setTimeout(() => {
        if (e.currentTarget.style) e.currentTarget.style.opacity = '0.4';
    }, 0);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Nécessaire pour permettre le drop
    e.dataTransfer.dropEffect = "move";
  };
  
  const handleDropAnnexe = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    if (e.currentTarget.style) e.currentTarget.style.opacity = '1'; // Rétablir l'opacité
    
    const draggedIndex = dragItem.current;
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    setAnnexes(prev => {
      const newAnnexes = [...prev];
      const draggedItem = newAnnexes[draggedIndex];
      
      // Retirer l'élément de sa position initiale
      newAnnexes.splice(draggedIndex, 1);
      
      // Insérer l'élément à la nouvelle position
      newAnnexes.splice(dropIndex, 0, draggedItem);
      
      dragItem.current = null;
      return newAnnexes;
    });
  };

  // 4. Nettoyage global
  const handleClearAllFiles = () => {
    if (sourceFile) URL.revokeObjectURL(sourceFile.url);
    annexes.forEach(pdf => URL.revokeObjectURL(pdf.url));
    setSourceFile(null);
    setAnnexes([]);
    setSelectedPdfId(null);
    setCurrentPage(1);
    setCurrentNumPages(0);
    setActivePreviewArea('source');
    if (sourceFileInputRef.current) sourceFileInputRef.current.value = "";
    if (annexeFileInputRef.current) annexeFileInputRef.current.value = "";
  };
  
  // Fonctions pour le Drag & Drop sur l'Uploader (pour Source ou Annexes)
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDropSource = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Processer uniquement le premier fichier pour le Source
      processSourceFile(e.dataTransfer.files[0]);
    }
  };
  
  const handleDropAnnexes = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processAnnexes(e.dataTransfer.files);
    }
  };

  // --- Submission ---
  const handleSubmit = async () => {
    if (!sourceFile) {
      alert("Veuillez charger le Courrier.");
      return;
    }
  
    setIsSubmitting(true);
  
    const filesToSend = [sourceFile, ...annexes];
    const uniqueKey = Date.now();
  
    // Construction du JSON metadata
    const jsonPayload = {
      meta: {
        flux:'simpaap',
        submissionDate: new Date().toISOString(),
        numTraitement : uniqueKey,
        client: session?.user?.tenantSlug || 'unknown',
        user: session?.user?.email || 'unknown',
        userName: session?.user?.name || null,
        totalFiles: filesToSend.length,
        totalPages: totalPages,
        uniqueKey : uniqueKey,
        files: filesToSend.map((pdf, index) => ({
          id: `${uniqueKey}_${index}_${pdf.Courrier ? 'Courrier' : 'Annexe'}`,
          originfilename: pdf.file.name,
          pages: pdf.numPages,
          size: pdf.file.size,
          isCourrier: pdf.Courrier,
          order: index,
        }))
      },
      productionOptions: {
        print: {
          color: selectedColor ? {
            id: selectedColor.id,
            value: selectedColor.value,
            label: selectedColor.label,
          } : null,
          side: selectedSide ? {
            id: selectedSide.id,
            value: selectedSide.value,
            label: selectedSide.label,
          } : null,
        },
        finishing: {
          envelope: selectedEnveloppe ? {
            taille: selectedEnveloppe.taille,
            fullName: selectedEnveloppe.fullName,
            pdsMax: selectedEnveloppe.pdsMax,
            poids: selectedEnveloppe.poids,
            addrX: selectedEnveloppe.addrX,
            addrY: selectedEnveloppe.addrY,
            addrH: selectedEnveloppe.addrH,
            addrL: selectedEnveloppe.addrL,
          } : null,
          insertType: 'automatic'
        },
        postage: {
          separation: separation,
          totalLetters: totalLetters,
          pagesPerEnvelope: pagesPerEnvelope,
          sheetsPerEnvelope: sheetsPerEnvelope,
          weightPerEnvelope: weightPerEnvelope,
          speed: selectedSpeed ? {
            id: selectedSpeed.id,
            value: selectedSpeed.value,
            label: selectedSpeed.label,
          } : null,
          affranchissement: calculatedRate ? {
            id: calculatedRate.id,
            fullName: calculatedRate.fullName,
            name: calculatedRate.name,
            price: calculatedRate.price,
            speed: calculatedRate.speed,
          } : null,
          estimatedTotalPrice: totalPostageCost,
        }
      }
    };
  
    try {
      const formData = new FormData();
  
      // Ajouter les fichiers AVEC LEUR ID EXACT EN NOM
      filesToSend.forEach((pdf, index) => {
        const id = jsonPayload.meta.files[index].id;
        formData.append(id, pdf.file, `${id}.pdf`);
      });
  
      formData.append('metadata', JSON.stringify(jsonPayload));
  
      const response = await fetch('/api/app/sendDataFtp', {
        method: 'POST',
        body: formData,
      });
  
      const result = await response.json();
  
      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'upload');
      }
  
      // On nettoie les blob URLs après succès
      filesToSend.forEach(pdf => URL.revokeObjectURL(pdf.url));
  
      setIsSubmitting(false);
      setActiveStep('success');
  
    } catch (error: any) {
      console.error("--- ERREUR UPLOAD ---", error);
      alert(`Erreur lors de l'envoi: ${error.message}`);
      setIsSubmitting(false);
    }
  };

  // --- Sub-Components ---

  const SourceUploader = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
      <FileText size={20} className="text-blue-600" />
        1. Courrier (obligatoire)
      </h2>
  
      {!sourceFile ? (
        <div
        onClick={() => sourceFileInputRef.current?.click()}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDropSource}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all 
          ${dragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary hover:bg-primary/5"} 
          group`}
      >
        {/* Overlay semi-transparent pendant le drag */}
        {dragActive && <div className="absolute inset-0 bg-primary/10 rounded-xl pointer-events-none" />}
      
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-muted text-muted-foreground group-hover:scale-110 transition-transform">
            <Upload size={24} />
          </div>
      
          <div className="space-y-1">
            <p className="font-semibold text-foreground truncate">
              Cliquez ou glissez-déposez le PDF source
            </p>
            <p className="text-sm text-muted-foreground">Un seul fichier PDF</p>
          </div>
        </div>
      </div>
      ) : (
        <Card
          //className="p-3 flex items-center justify-between cursor-pointer transition-all"
          className={`p-3 flex items-center justify-between cursor-pointer transition-all ${ activePreviewArea === 'source' ? 'border-blue-200 ring-2 ring-blue-200' : '' }`}
          onClick={() => {
            setSelectedPdfId(sourceFile.id);
            setActivePreviewArea("source");
          }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg border bg-card">
            <FileText size={20} className="text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">Source : {sourceFile.file.name}</p>
              <p className="text-xs">
                {(sourceFile.file.size / 1024 / 1024).toFixed(2)} MB
                {sourceFile.numPages > 0 && ` • ${sourceFile.numPages} page${sourceFile.numPages > 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
          <Button variant="destructive" size="icon" onClick={(e) => { e.stopPropagation(); handleRemoveSource(); }}>
            <Trash2 size={16} />
          </Button>
        </Card>
      )}
    </div>
  );
  
  const AnnexesList = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <ListOrdered size={20} className="text-blue-600" />
        2. Annexes ({annexes.length} fichier{annexes.length > 1 ? "s" : ""})
      </h2>
  
      <div className="space-y-2">
        {annexes.map((pdf, index) => (
          <Card
            key={pdf.id}
            className="p-3 flex items-center justify-between transition-all cursor-pointer hover:text-orange-700 p-2 hover:bg-orange-50 rounded transition-colors"
            draggable={true}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDropAnnexe(e, index)}
            onDragEnd={(e) => { e.currentTarget.style.opacity = "1"; dragItem.current = null; }}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-sm font-bold w-5 text-center">{index + 1}</span>
              <FileText size={20} className="text-orange-600" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{pdf.file.name}</p>
                <p className="text-xs">
                  {(pdf.file.size / 1024 / 1024).toFixed(2)} MB
                  {pdf.numPages > 0 && ` • ${pdf.numPages} page${pdf.numPages > 1 ? "s" : ""}`}
                </p>
              </div>
            </div>
            <Button variant="destructive" size="icon" onClick={(e) => { e.stopPropagation(); handleRemoveAnnexe(pdf.id); }}>
              <Trash2 size={16} />
            </Button>
          </Card>
        ))}
  
        <Button size="default" variant="outline" className="w-full flex items-center justify-center gap-2" onClick={() => annexeFileInputRef.current?.click()}>
          <Plus size={20} />
          Ajouter une annexe
        </Button>
      </div>
    </div>
  );

  // --- Success View ---
  if (activeStep === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={32} strokeWidth={3} />
            </div>
            <CardTitle className="text-2xl">Envoi confirmé !</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="space-y-1">
              <p className="text-muted-foreground">
                {totalLetters} destinataire{totalLetters > 1 ? 's' : ''} • {totalPages} page{totalPages > 1 ? 's' : ''}
              </p>
              <p className="text-sm text-muted-foreground">
                {1 + annexes.length} document{1 + annexes.length > 1 ? 's' : ''} transmis
              </p>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Destinataires</span>
                <span className="font-medium">{totalLetters}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Affranchissement</span>
                <span className="font-medium">{calculatedRate?.fullName || '-'}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="font-semibold">Total estimé</span>
                <span className="font-bold text-green-600 dark:text-green-400">{totalPostageCost.toFixed(2)} € HT</span>
              </div>
            </div>

            <Button
              onClick={() => { handleClearAllFiles(); setActiveStep('config'); }}
              className="w-full"
              size="lg"
            >
              Nouveau dépôt
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Main Layout ---
  return (
    <div className="min-h-screen bg-background font-sans text-foreground pb-20">
      
      {/* INPUTS invisibles pour gérer l'ouverture de la fenêtre de dialogue */}
      <input 
        type="file" 
        accept=".pdf" 
        onChange={handleSourceUpload} 
        ref={sourceFileInputRef}
        className="hidden"
      />
      <input 
        type="file" 
        accept=".pdf" 
        onChange={handleAnnexesUpload} 
        ref={annexeFileInputRef}
        className="hidden"
        multiple
      />
      
      <header className="bg-background border-b border-border py-6 mb-8">
  <div className="mx-auto px-6 lg:px-12">
    <h1 className="text-2xl font-bold text-foreground">Dépôt et configuration</h1>
    <p className="text-muted-foreground">
      Configurez les options d'impression et d'envoi de vos courriers
    </p>
  </div>
</header>

      <main className="mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-7 space-y-6">
  <section>
    <SourceUploader />
  </section>

  <hr className="border-slate-200" />

  <section>
    <AnnexesList />
  </section>

  <section className={!sourceFile ? "opacity-50 pointer-events-none grayscale transition-all" : "transition-all"}>
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Printer size={20} className="text-blue-600" />
        Options d'impression
      </h2>
    </div>

    <Card className="p-6 space-y-6">
      {loadingOptions ? (
        <div className="text-center py-4 text-muted-foreground">Chargement des options...</div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label>Mode couleur</Label>
          {colors.length > 0 ? (
            <Select
              value={selectedColor?.id?.toString() || ''}
              onValueChange={(id) => {
                const color = colors.find(c => c.id === parseInt(id));
                if (color) setSelectedColor(color);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionnez un mode couleur" />
              </SelectTrigger>
              <SelectContent>
                {colors.map((color) => (
                  <SelectItem key={color.id} value={color.id.toString()}>
                    {color.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-destructive mt-1">Aucune option de couleur disponible</p>
          )}
        </div>

        <div>
          <Label>Type d&apos;impression</Label>
          {sides.length > 0 ? (
            <Select
              value={selectedSide?.id?.toString() || ''}
              onValueChange={(id) => {
                const side = sides.find(s => s.id === parseInt(id));
                if (side) setSelectedSide(side);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionnez le type d'impression" />
              </SelectTrigger>
              <SelectContent>
                {sides.map((side) => (
                  <SelectItem key={side.id} value={side.id.toString()}>
                    {side.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-destructive mt-1">Aucune option de côté disponible</p>
          )}
        </div>
      </div>
      )}

      <hr className="border-slate-200" />

      <div>
        <Label>Format d&apos;enveloppe</Label>
        {availableEnveloppes.length > 0 ? (
          <>
            <Select
              value={selectedEnveloppe?.taille || ''}
              onValueChange={(taille) => {
                const env = availableEnveloppes.find(e => e.taille === taille);
                if (env) setSelectedEnveloppe(env);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionnez un format" />
              </SelectTrigger>
              <SelectContent>
                {availableEnveloppes.map((env) => (
                  <SelectItem key={env.id} value={env.taille}>
                    {env.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedEnveloppe && (
              <div className="mt-2 text-xs space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Poids des feuilles:</span>
                  <span className="font-medium">{sheetsWeight}g</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Capacité max:</span>
                  <span className="font-medium">{selectedEnveloppe.pdsMax}g</span>
                </div>
                {sheetsWeight > selectedEnveloppe.pdsMax && (
                  <p className="text-xs text-destructive font-medium">
                    ⚠️ Veuillez choisir une autre enveloppe !!!
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-destructive mt-1">
            {enveloppes.length === 0
              ? "Aucune enveloppe disponible"
              : "Aucune enveloppe ne peut porter ce poids. Réduisez le nombre de pages."}
          </p>
        )}
      </div>
    </Card>
  </section>

  <section className={!sourceFile ? "opacity-50 pointer-events-none grayscale transition-all" : "transition-all"}>
    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
      <Truck size={20} className="text-blue-600" />
      Affranchissement <p className="text-sm text-destructive">( Estimation )</p>
    </h2>
    <Card className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label>Vitesse d&apos;envoi</Label>
          {speeds.length > 0 ? (
            <Select
              value={selectedSpeed?.id?.toString() || ''}
              onValueChange={(id) => {
                const speed = speeds.find(s => s.id === parseInt(id));
                if (speed) setSelectedSpeed(speed);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionnez une vitesse" />
              </SelectTrigger>
              <SelectContent>
                {speeds.map((speed) => (
                  <SelectItem key={speed.id} value={speed.id.toString()}>
                    {speed.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-destructive mt-1">Aucune vitesse disponible</p>
          )}
        </div>

        <div>
          <Label htmlFor="separation">Pages par destinataire (publipostage)</Label>
          <Input
            id="separation"
            type="number"
            min={1}
            value={separation}
            onChange={(e) => setSeparation(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Nombre de pages du document source par destinataire
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tarif calculé</Label>
        {loadingRate ? (
          <p className="text-sm text-muted-foreground">Calcul en cours...</p>
        ) : calculatedRate ? (
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">{calculatedRate.fullName}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{calculatedRate.pdsMin}g - {calculatedRate.pdsMax}g</span>
              {calculatedRate.speed && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {calculatedRate.speed.label}
                </span>
              )}
            </div>
            <p className="text-lg font-bold text-green-600">
              {calculatedRate.price.toFixed(4)} € / destinataire
            </p>
          </div>
        ) : (
          <p className="text-sm text-destructive">
            Aucun tarif trouvé pour ce poids ({weightPerEnvelope}g){selectedSpeed && ` et cette vitesse (${selectedSpeed.label})`}
          </p>
        )}
      </div>
    </Card>
  </section>
</div>


        <div className="lg:col-span-5">
            <div className="sticky top-8">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Layers size={20} className="text-blue-600" />
                Aperçu (Courrier Uniquement)
              </h2>
              
              <Card>
  <CardContent className="space-y-6">
    {/* Aperçu du document */}
    {/*<DocumentPreview />*/}
    <PdfViewer
      // 1. Les données du fichier
      selectedPdf={selectedPdf}
      fileName={selectedPdf?.file.name || ''}
      fileLabel={activePreviewArea === 'source' ? 'Source' : `Annexe #${annexes.findIndex(a => a.id === selectedPdf?.id) + 1}`}

      // 2. Pagination
      currentPage={currentPage}
      currentNumPages={currentNumPages}
      onPageChange={setCurrentPage}

      // 3. Logique d'affichage de la fenêtre calculée ICI dans le parent
      showWindow={activePreviewArea === 'source' && currentPage === 1}

      // 4. Zone d'adresse en mm (depuis les settings de l'enveloppe)
      addressWindow={selectedEnveloppe ? {
        x: selectedEnveloppe.addrX,
        y: selectedEnveloppe.addrY,
        width: selectedEnveloppe.addrL,  // largeur
        height: selectedEnveloppe.addrH, // hauteur
      } : null}
      envelopeLabel={`Fenêtre ${selectedEnveloppe?.fullName || ''}`}
    />

    {/* Récapitulatif */}
    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
      <ShoppingBasket size={20} className="text-blue-600" />
      Récapitulatif
    </h2>
    

    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span>Destinataires</span>
        <span className="font-medium">{totalLetters || '-'}</span>
      </div>
      <div className="flex justify-between">
        <span>Séparation</span>
        <span className="font-medium">{separation} page{separation > 1 ? 's' : ''}/dest.</span>
      </div>
      
      <div className="flex justify-between">
        <span>Annexes</span>
        <span className="font-medium">{annexes.length} ({annexePagesTotal} pages)</span>
      </div>
      <div className="flex justify-between">
        <span>Impression</span>
        <span className="font-medium">
          {selectedColor?.label || '-'} • {selectedSide?.label || '-'}
        </span>
      </div>
      <div className="flex justify-between">
        <span>Enveloppe</span>
        <span className="font-medium">{`${selectedEnveloppe?.fullName} (${selectedEnveloppe?.poids}g)` || '-'}</span>
      </div>
      <div className="flex justify-between">
        <span>Feuilles/dest.</span>
        <span className="font-medium">{sheetsPerEnvelope} {`(${sheetsWeight} g)`}</span>
      </div>
      <div className="flex justify-between">
        <span>Poids/dest.</span>
        <span className="font-medium">{weightPerEnvelope}g</span>
      </div>
      <div className="flex justify-between">
        <span>Vitesse</span>
        <span className="font-medium">{selectedSpeed?.label || '-'}</span>
      </div>
      <div className="flex justify-between border-t pt-2 mt-2">
        <span className="font-semibold">Affranchissement</span>
        <span className="font-bold text-green-600">{totalPostageCost.toFixed(2)} €</span>
      </div>
    </div>
  </CardContent>
</Card>
            </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 shadow-lg z-50">
  <div className="mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-0">

    <div className="hidden md:flex flex-col">
      <p className="text-sm text-muted-foreground">
        {totalLetters} Destinataire{totalLetters > 1 ? 's' : ''} • {pagesPerEnvelope} page{pagesPerEnvelope > 1 ? 's' : ''} ({sheetsPerEnvelope} feuille{sheetsPerEnvelope > 1 ? 's' : ''}) • {weightPerEnvelope}g
      </p>
      <p className="font-semibold text-foreground">
        Total affranchissement : {totalPostageCost.toFixed(2)} € HT
        {calculatedRate && <span className="text-sm font-normal text-muted-foreground ml-2">({calculatedRate.fullName})</span>}
      </p>
      <p className="text-xs text-destructive font-medium mt-1">
        ⚠️ Estimation - Le prix réel peut différer après traitement
      </p>
    </div>

    <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
      <Button className="flex-1 md:flex-none w-full md:w-auto bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleSubmit}
        disabled={
          !sourceFile ||
          isSubmitting ||
          !selectedColor ||
          !selectedSide ||
          !selectedEnveloppe ||
          !selectedSpeed ||
          !calculatedRate ||
          (selectedEnveloppe && sheetsWeight > selectedEnveloppe.pdsMax)
        }
      >
        {isSubmitting ? 'Traitement...' : 'VALIDER ET ENVOYER'}
      </Button>
    </div>

  </div>
</div>

    </div>
  );
}