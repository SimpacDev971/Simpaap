export default function PdfViewerPane({ file }: { file: File }) {
    if (!file) return <div className="text-gray-500">Aucune annexe sélectionnée</div>;
  
    const url = URL.createObjectURL(file);
  
    return (
      <iframe
        src={url}
        className="w-full h-full rounded-xl border"
        title="PDF Viewer"
      />
    );
  }