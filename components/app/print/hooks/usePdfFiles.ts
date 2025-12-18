import { useCallback, useRef, useState } from 'react';
import { pdfjs } from 'react-pdf';
import { ActiveFileArea, PDFFile } from '../types';

interface UsePdfFilesReturn {
  sourceFile: PDFFile | null;
  annexes: PDFFile[];
  selectedPdfId: string | null;
  activePreviewArea: ActiveFileArea;
  totalPages: number;
  selectedPdf: PDFFile | null;

  // Source file operations
  processSourceFile: (file: File) => Promise<void>;
  removeSource: () => void;

  // Annexes operations
  processAnnexes: (files: FileList) => Promise<void>;
  removeAnnexe: (id: string) => void;
  reorderAnnexes: (dragIndex: number, dropIndex: number) => void;

  // Preview operations
  setSelectedPdfId: (id: string | null) => void;
  setActivePreviewArea: (area: ActiveFileArea) => void;

  // Global operations
  clearAllFiles: () => void;

  // Refs
  sourceFileInputRef: React.RefObject<HTMLInputElement | null>;
  annexeFileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function usePdfFiles(): UsePdfFilesReturn {
  const [sourceFile, setSourceFile] = useState<PDFFile | null>(null);
  const [annexes, setAnnexes] = useState<PDFFile[]>([]);
  const [selectedPdfId, setSelectedPdfId] = useState<string | null>(null);
  const [activePreviewArea, setActivePreviewArea] = useState<ActiveFileArea>('source');

  const sourceFileInputRef = useRef<HTMLInputElement>(null);
  const annexeFileInputRef = useRef<HTMLInputElement>(null);

  // Calculate total pages
  const totalPages = (sourceFile?.numPages || 0) + annexes.reduce((sum, pdf) => sum + pdf.numPages, 0);

  // Get selected PDF for preview
  const selectedPdf = activePreviewArea === 'source'
    ? sourceFile
    : annexes.find(pdf => pdf.id === selectedPdfId) || null;

  // Helper function to get PDF page count
  const getPdfPages = async (file: File, url: string): Promise<number> => {
    try {
      const loadedPdf = await pdfjs.getDocument(url).promise;
      return loadedPdf.numPages;
    } catch (error) {
      console.error("Error reading PDF pages:", file.name, error);
      return 0;
    }
  };

  // Process source file
  const processSourceFile = useCallback(async (selectedFile: File) => {
    if (selectedFile.type !== 'application/pdf') {
      alert(`${selectedFile.name}: Seuls les fichiers PDF sont acceptés.`);
      return;
    }

    // Clean up old file if exists
    if (sourceFile) URL.revokeObjectURL(sourceFile.url);

    const id = `source_${Date.now()}`;
    const url = URL.createObjectURL(selectedFile);
    const numPages = await getPdfPages(selectedFile, url);

    const newSourceFile: PDFFile = { id, file: selectedFile, url, numPages, Courrier: true };

    setSourceFile(newSourceFile);
    setSelectedPdfId(newSourceFile.id);
    setActivePreviewArea('source');
  }, [sourceFile]);

  // Remove source file
  const removeSource = useCallback(() => {
    if (sourceFile) {
      URL.revokeObjectURL(sourceFile.url);
      setSourceFile(null);

      if (annexes.length > 0) {
        // Select first annexe if exists
      } else {
        setSelectedPdfId(null);
        setActivePreviewArea('source');
      }
    }
  }, [sourceFile, annexes.length]);

  // Process annexes
  const processAnnexes = useCallback(async (selectedFiles: FileList) => {
    const filePromises = Array.from(selectedFiles).map(async (file) => {
      if (file.type !== 'application/pdf') return null;

      const id = `annexe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const url = URL.createObjectURL(file);
      const numPages = await getPdfPages(file, url);

      return { id, file, url, numPages, Courrier: false };
    });

    const newPdfFiles = (await Promise.all(filePromises)).filter((f): f is PDFFile => f !== null);

    if (newPdfFiles.length === 0) return;

    setAnnexes(prev => [...prev, ...newPdfFiles]);

    if (!sourceFile && !selectedPdfId) {
      setSelectedPdfId(newPdfFiles[0].id);
    }
  }, [sourceFile, selectedPdfId]);

  // Remove annexe
  const removeAnnexe = useCallback((id: string) => {
    setAnnexes(prev => {
      const pdfToRemove = prev.find(pdf => pdf.id === id);
      if (pdfToRemove) URL.revokeObjectURL(pdfToRemove.url);

      const remaining = prev.filter(pdf => pdf.id !== id);

      if (selectedPdfId === id) {
        if (sourceFile) {
          setSelectedPdfId(sourceFile.id);
          setActivePreviewArea('source');
        } else if (remaining.length > 0) {
          setSelectedPdfId(remaining[0].id);
        } else {
          setSelectedPdfId(null);
          setActivePreviewArea('source');
        }
      }
      return remaining;
    });
  }, [selectedPdfId, sourceFile]);

  // Reorder annexes
  const reorderAnnexes = useCallback((dragIndex: number, dropIndex: number) => {
    if (dragIndex === dropIndex) return;

    setAnnexes(prev => {
      const newAnnexes = [...prev];
      const draggedItem = newAnnexes[dragIndex];
      newAnnexes.splice(dragIndex, 1);
      newAnnexes.splice(dropIndex, 0, draggedItem);
      return newAnnexes;
    });
  }, []);

  // Clear all files
  const clearAllFiles = useCallback(() => {
    if (sourceFile) URL.revokeObjectURL(sourceFile.url);
    annexes.forEach(pdf => URL.revokeObjectURL(pdf.url));
    setSourceFile(null);
    setAnnexes([]);
    setSelectedPdfId(null);
    setActivePreviewArea('source');
    if (sourceFileInputRef.current) sourceFileInputRef.current.value = "";
    if (annexeFileInputRef.current) annexeFileInputRef.current.value = "";
  }, [sourceFile, annexes]);

  return {
    sourceFile,
    annexes,
    selectedPdfId,
    activePreviewArea,
    totalPages,
    selectedPdf,
    processSourceFile,
    removeSource,
    processAnnexes,
    removeAnnexe,
    reorderAnnexes,
    setSelectedPdfId,
    setActivePreviewArea,
    clearAllFiles,
    sourceFileInputRef,
    annexeFileInputRef,
  };
}
