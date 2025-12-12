// --- /components/PdfPreview/PdfPreview.tsx ---

'use client';


import { useMailStore } from '@/app/store/mailStore';
import PdfViewer from '../PdfViewer'; // Le composant optimisé 'memo'

const PdfPreview = () => {
  // Extraction des données brutes
  const { sourceFile, annexes, selectedPdfId, options } = useMailStore(state => ({
    sourceFile: state.sourceFile,
    annexes: state.annexes,
    selectedPdfId: state.selectedPdfId,
    options: state.options,
  }));
  
  // Calcul du fichier sélectionné
  const selectedPdf = sourceFile?.id === selectedPdfId 
    ? sourceFile 
    : annexes.find(a => a.id === selectedPdfId) || null;
    
  // Calcul du label (nécessite de retrouver l'index de l'annexe)
  const fileLabel = selectedPdf 
    ? selectedPdf.Courrier 
      ? 'Source' 
      : `Annexe #${annexes.findIndex(a => a.id === selectedPdf.id) + 1}`
    : '';

  // Condition de la fenêtre (doit être calculée ici si la logique reste simple)
  // NOTE: Dans le code initial, activePreviewArea n'existe plus, on déduit si c'est la source.
  const isSource = selectedPdf?.Courrier ?? false;
  const showWindow = isSource; // On suppose que la fenêtre s'affiche toujours si c'est le Courrier source

  if (!selectedPdf) {
      return <div className="text-center text-slate-500 py-10">Aucun document sélectionné</div>;
  }
  
  return (
    <PdfViewer
      selectedPdf={selectedPdf}
      fileName={selectedPdf.file.name}
      // NOTE: Le composant PdfPreview fixe la page à 1, ce qui pourrait ne pas être idéal.
      // Dans une implémentation complète, la page courante devrait aussi venir du store
      // ou être gérée localement par le composant parent.
      currentPage={1} 
      currentNumPages={selectedPdf.numPages}
      
      // onPageChange est vide ici, il faudrait lui donner la vraie fonction setCurrentPage
      onPageChange={()=>{ console.warn("La pagination n'est pas encore implémentée dans le store/parent."); }}
      
      // On passe uniquement les props nécessaires au Viewer
      envelopeType={options.envelope}
      showWindow={showWindow}
      fileLabel={fileLabel}
    />
  );
};

export default PdfPreview;