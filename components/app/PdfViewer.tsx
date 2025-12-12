import { ChevronLeft, ChevronRight, FileText } from 'lucide-react'; // Adaptez selon votre lib d'icônes
import { memo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf'; // + vos imports d'icônes (ChevronLeft, etc.)

// Utilisation d'une URL absolue pour une meilleure portabilité (si la configuration le permet)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

// Définition propre des props
interface PdfViewerProps {
  selectedPdf: { id: string; file: File; url: string; numPages: number } | null;
  currentPage: number;
  currentNumPages: number;
  envelopeType: string; // On passe juste le string (ex: 'C6/5'), pas tout l'objet options
  //showWindow: boolean;  // Calculé par le parent (activePreviewArea === 'source' && page === 1)
  showWindow?: boolean;
  fileName: string;
  fileLabel: string;    // Ex: "Source" ou "Annexe #1"
  onPageChange: (newPage: number) => void;
}

const PdfViewer = memo(({ 
  selectedPdf, 
  currentPage, 
  currentNumPages, 
  envelopeType, 
  showWindow, 
  fileName,
  fileLabel,
  onPageChange 
}: PdfViewerProps) => {

  // 1. Gestion du cas "Pas de PDF"
  if (!selectedPdf) {
    return (
      <div className="h-[400px] bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 border border-slate-200">
        <div className="text-center">
          <FileText size={48} className="mx-auto mb-2 opacity-50" />
          <p>Aucun document sélectionné</p>
        </div>
      </div>
    );
  }

  // 2. Calcul du style de la fenêtre (Dépend uniquement de envelopeType passé en prop)
  const getWindowStyle = () => {
    switch (envelopeType) {
      case "C6/5": return { top: "22%", right: "10%", width: "45%", height: "14%" };
      case "C5":   return { top: "25%", right: "10%", width: "45%", height: "18%" };
      case "C4":   return { top: "15%", right: "10%", width: "45%", height: "15%" };
      default: return { display: "none" };
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-[300px] mx-auto mt-5">
        
        {/* LE COEUR DU PROBLÈME RÉSOLU : 
            React-pdf ne se rechargera pas tant que 'selectedPdf.id' ne change pas 
        */}
        <Document
          key={selectedPdf.id} 
          file={selectedPdf.file}
          loading={<div className="h-[400px] flex items-center justify-center">Chargement…</div>}
        >
          <Page
            key={`${selectedPdf.id}-${currentPage}`}
            pageNumber={currentPage}
            width={300}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>

        {/* Calque Fenêtre */}
        {showWindow && (
          <div
            style={getWindowStyle()}
            className="absolute border-2 border-dashed border-red-500 bg-red-500/10 backdrop-blur-[1px] rounded flex items-center justify-center pointer-events-none z-10 transition-all duration-300"
          >
            <span className="text-[10px] font-bold text-red-600 bg-white/90 px-1 shadow-sm whitespace-nowrap">
              Fenêtre {envelopeType}
            </span>
          </div>
        )}

        <div className="absolute bottom-2 right-2 text-[10px] bg-black/50 text-white px-2 py-0.5 rounded backdrop-blur-sm z-20">
          Page {currentPage} / {currentNumPages || '?'} 
        </div>
      </div>

      {/* Contrôles de pagination */}
      <div className="flex items-center space-x-4 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200 mt-4">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="p-1 hover:bg-slate-100 rounded-full disabled:opacity-30 disabled:cursor-not-allowed text-slate-700"
        >
          <ChevronLeft size={20} />
        </button>

        <span className="text-sm font-medium tabular-nums text-slate-700">
          {currentNumPages ? `${currentPage} / ${currentNumPages}` : "--"}
        </span>

        <button
          onClick={() => onPageChange(Math.min(currentNumPages, currentPage + 1))}
          disabled={currentPage >= currentNumPages}
          className="p-1 hover:bg-slate-100 rounded-full disabled:opacity-30 disabled:cursor-not-allowed text-slate-700"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="text-xs text-slate-500 mt-2">
        {fileName} (<span className="font-semibold">{fileLabel}</span>)
      </div>
    </div>
  );
// Le second argument de memo est optionnel, mais par sécurité, on laisse React faire la comparaison superficielle (shallow)
});

export default PdfViewer;