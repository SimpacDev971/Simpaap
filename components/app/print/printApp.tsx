'use client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  Check,
  FileText,
  Layers,
  ListOrdered,
  Plus,
  Printer,
  Trash2,
  Truck,
  Upload
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pdfjs } from "react-pdf";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import PdfViewer from "../PdfViewer";

// --- DÉBUT DE LA CORRECTION CRITIQUE (Web Worker PDF.js) ---
// Utilisation d'une URL absolue pour une meilleure portabilité (si la configuration le permet)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();
// --- FIN DE LA CORRECTION CRITIQUE ---

// --- Types & Constants ---

type PrintColor = 'noir_blanc' | 'couleur';
type PrintSide = 'recto' | 'recto_verso';
type EnvelopeType = 'C6/5' | 'C5' | 'C4';
type PostageSpeed = 'J+1' | 'J+2' | 'J+3';
type PostageType = 'recommande' | 'economique' | 'rapide';
type ActiveFileArea = 'source' | 'annexes'; // Pour la gestion de l'aperçu

interface MailOptions {
  color: PrintColor;
  side: PrintSide;
  envelope: EnvelopeType;
  postageType: PostageType;
  postageSpeed: PostageSpeed;
}

interface PDFFile {
  id: string;
  file: File;
  url: string;
  numPages: number;
  Courrier :  boolean
}

const DEFAULT_OPTIONS: MailOptions = {
  color: 'noir_blanc',
  side: 'recto',
  envelope: 'C6/5',
  postageType: 'economique',
  postageSpeed: 'J+3'
};

const ENVELOPE_TYPES = [
  { value: 'C6/5', label: 'C6/5 (Format classique - plié en 3)' },
  { value: 'C5', label: 'C5 (Demi A4 - plié en 2)' },
  { value: 'C4', label: 'C4 (Grand format A4 - non plié)' },
];

const POSTAGE_TYPES = [
  { value: 'economique', label: 'Économique (Ecopli)' },
  { value: 'rapide', label: 'Rapide (Lettre Verte / Prioritaire)' },
  { value: 'recommande', label: 'Recommandé (LRAR)' },
];

const POSTAGE_SPEEDS = [
  { value: 'J+1', label: 'J+1 (Urgent)' },
  { value: 'J+2', label: 'J+2 (Standard)' },
  { value: 'J+3', label: 'J+3 (Éco)' },
];

// --- Main Application Component ---

export default function PrintApp() {
  // NOUVEAUX ÉTATS
  const [sourceFile, setSourceFile] = useState<PDFFile | null>(null);
  const [annexes, setAnnexes] = useState<PDFFile[]>([]);
  // Ancien selectedPdfId pour la prévisualisation
  const [selectedPdfId, setSelectedPdfId] = useState<string | null>(null); 
  // Nouvel état pour savoir si on regarde le source ou une annexe
  const [activePreviewArea, setActivePreviewArea] = useState<ActiveFileArea>('source');
  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [currentNumPages, setCurrentNumPages] = useState<number>(0); 
  const [options, setOptions] = useState<MailOptions>(DEFAULT_OPTIONS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState<'upload' | 'config' | 'success'>('config');
  
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

  const updateOption = (key: keyof MailOptions, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }));
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
        submissionDate: new Date().toISOString(),
        client: 'session.user.tenantSlug',
        user: 'session.user.name',
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
          color: options.color === 'couleur',
          duplex: options.side === 'recto_verso'
        },
        finishing: {
          envelope: options.envelope,
          insertType: 'automatic'
        },
        logistics: {
          carrier: 'LA_POSTE',
          productCode: options.postageType,
          serviceLevel: options.postageSpeed
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

  // --- Success View (inchangé) ---
  if (activeStep === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={32} strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Courrier envoyé !</h2>
          <p className="text-slate-600 mb-2">
            {totalPages} page{totalPages > 1 ? 's ont' : ' a'} été transmis ({1 + annexes.length} document{1 + annexes.length > 1 ? 's' : ''}).
          </p>
          <p className="text-sm text-slate-500 mb-8">
            Total: {totalPages} page{totalPages > 1 ? 's' : ''}
          </p>
          <button 
            onClick={() => { handleClearAllFiles(); setActiveStep('config'); }}
            className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 w-full"
          >
            Nouveau dépôt
          </button>
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
  <div className="container mx-auto px-4 max-w-5xl">
    <h1 className="text-2xl font-bold text-foreground">Dépôt et configuration</h1>
    <p className="text-muted-foreground">
      Configurez les options d'impression et d'envoi de vos courriers
    </p>
  </div>
</header>

      <main className="container mx-auto px-4 max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label>Mode couleur</Label>
          <Select
            value={options.color}
            onValueChange={(v) => updateOption('color', v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sélectionnez un mode couleur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="noir_blanc">Noir et Blanc</SelectItem>
              <SelectItem value="couleur">Couleur</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Type d'impression</Label>
          <Select
            value={options.side}
            onValueChange={(v) => updateOption('side', v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sélectionnez le type d'impression" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recto">Recto seul</SelectItem>
              <SelectItem value="recto_verso">Recto / Verso</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <hr className="border-slate-200" />

      <div>
        <Label>Format d'enveloppe</Label>
        <Select
          value={options.envelope}
          onValueChange={(v) => updateOption('envelope', v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sélectionnez un format" />
          </SelectTrigger>
          <SelectContent>
            {ENVELOPE_TYPES.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="mt-2 text-xs flex items-center gap-1">
          <AlertCircle size={12} className="text-blue-600" />
          {options.envelope === 'C4'
            ? 'Les documents seront envoyés à plat (sans pliage).'
            : 'Les documents seront pliés pour correspondre à l’enveloppe.'}
        </div>
      </div>
    </Card>
  </section>

  <section className={!sourceFile ? "opacity-50 pointer-events-none grayscale transition-all" : "transition-all"}>
    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
      <Truck size={20} className="text-blue-600" />
      Affranchissement
    </h2>

    <Card className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <Label>Gamme</Label>
        <Select
          value={options.postageType}
          onValueChange={(v) => updateOption('postageType', v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sélectionnez une gamme" />
          </SelectTrigger>
          <SelectContent>
            {POSTAGE_TYPES.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Délai indicatif</Label>
        <Select
          value={options.postageSpeed}
          onValueChange={(v) => updateOption('postageSpeed', v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sélectionnez un délai" />
          </SelectTrigger>
          <SelectContent>
            {POSTAGE_SPEEDS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
  onPageChange={setCurrentPage} // Passer la fonction directement
  
  // 3. Configuration visuelle
  // L'astuce est ici : on passe 'options.envelope' (un string), pas 'options' (un objet)
  envelopeType={options.envelope}
  
  // 4. Logique d'affichage de la fenêtre calculée ICI dans le parent
  showWindow={activePreviewArea === 'source' && currentPage === 1}
/>

    {/* Récapitulatif */}
    <CardHeader className="pt-6 border-t">
     <CardTitle className="text-sm font-semibold">Récapitulatif</CardTitle>
    </CardHeader>

    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span>Page(s) Source</span>
        <span className="font-medium">{sourceFile ? sourceFile.numPages : 'Non chargé'}</span>
      </div>
      <div className="flex justify-between">
        <span>Nb Annexes</span>
        <span className="font-medium">{annexes.length || 0}</span>
      </div>
      <div className="flex justify-between">
        <span>Pages totales</span>
        <span className="font-medium">{totalPages > 0 ? totalPages : '-'}</span>
      </div>
      <div className="flex justify-between">
        <span>Impression</span>
        <span className="font-medium">
          {options.color === 'couleur' ? 'Couleur' : 'N&B'} • {options.side === 'recto' ? 'R' : 'R/V'}
        </span>
      </div>
      <div className="flex justify-between">
        <span>Enveloppe</span>
        <span className="font-medium">{options.envelope}</span>
      </div>
    </div>
  </CardContent>
</Card>
            </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 shadow-lg z-50">
  <div className="container mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-between gap-3 md:gap-0">
    
    <div className="hidden md:flex flex-col">
      <p className="text-sm text-muted-foreground">
        {1 + annexes.length} document{1 + annexes.length > 1 ? 's' : ''} • {totalPages} page{totalPages > 1 ? 's' : ''}
      </p>
      <p className="font-semibold text-foreground">
        Total estimé : {(totalPages * 0.15 + 1.20 * (1 + annexes.length)).toFixed(2)} € HT
      </p>
    </div>

    <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
      <Button className="flex-1 md:flex-none w-full md:w-auto bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleSubmit}
        disabled={!sourceFile || isSubmitting}
      >
        {isSubmitting ? 'Traitement...' : 'VALIDER ET ENVOYER'}
      </Button>
    </div>
    
  </div>
</div>

    </div>
  );
}