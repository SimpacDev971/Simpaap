import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`
// Address window dimensions interface (all values in mm)
interface AddressWindow {
  x: number;      // Position X from left edge in mm
  y: number;      // Position Y from top edge in mm
  width: number;  // Width in mm (addrL = largeur)
  height: number; // Height in mm (addrH = hauteur)
}

interface PdfViewerProps {
  selectedPdf: { id: string; file: File; url: string; numPages: number } | null;
  currentPage: number;
  currentNumPages: number;
  showWindow?: boolean;
  fileName: string;
  fileLabel: string;
  onPageChange: (newPage: number) => void;
  addressWindow?: AddressWindow | null;
  envelopeLabel?: string;
}

// PDF render width in pixels (fixed)
const RENDER_WIDTH = 300;

// Conversion factor from idea.txt: 1mm = 72/25.4 points (PostScript points)
const MM_TO_PT = 72 / 25.4;

const PdfViewer = memo(({
  selectedPdf,
  currentPage,
  currentNumPages,
  showWindow,
  fileName,
  fileLabel,
  onPageChange,
  addressWindow,
  envelopeLabel = 'Zone adresse',
}: PdfViewerProps) => {

  // State for original PDF page dimensions (in points at 72 DPI)
  const [pageDimensions, setPageDimensions] = useState<{
    widthPts: number;
    heightPts: number;
  } | null>(null);

  // Calculate scale and overlay position using idea.txt logic
  const { renderedHeight, scale, overlayStyle } = useMemo(() => {
    if (!pageDimensions) {
      return { renderedHeight: 0, scale: 1, overlayStyle: null };
    }

    const { widthPts, heightPts } = pageDimensions;

    // Scale factor for rendering (same as idea.txt)
    const renderScale = RENDER_WIDTH / widthPts;
    const renderedHeightPx = heightPts * renderScale;

    // Calculate overlay position in pixels using idea.txt formula:
    // xPx = xMm * MM_TO_PT * scale
    let overlay = null;
    if (addressWindow) {
      const xPx = addressWindow.x * MM_TO_PT * renderScale;
      const yPx = addressWindow.y * MM_TO_PT * renderScale;
      const wPx = addressWindow.width * MM_TO_PT * renderScale;
      const hPx = addressWindow.height * MM_TO_PT * renderScale;

      overlay = {
        left: xPx,
        top: yPx,
        width: wPx,
        height: hPx,
      };
    }

    return {
      renderedHeight: renderedHeightPx,
      scale: renderScale,
      overlayStyle: overlay,
    };
  }, [pageDimensions, addressWindow]);

  // Callback when page loads - get ORIGINAL dimensions from viewport at scale 1
  const handlePageLoad = (page: any) => {
    // Get the original page dimensions (unscaled) - this is critical for correct overlay positioning
    // react-pdf provides originalWidth/originalHeight for dimensions at scale 1 (72 DPI points)
    // Fallback: if rendered at RENDER_WIDTH, calculate original from aspect ratio
    let originalWidth = page.originalWidth;
    let originalHeight = page.originalHeight;

    // Fallback if originalWidth not available: use A4 default or calculate from aspect ratio
    if (!originalWidth || !originalHeight) {
      // If we have rendered dimensions, calculate aspect ratio and assume A4 width
      const aspectRatio = page.height / page.width;
      // A4 width in points = 595.28 (210mm * 72/25.4)
      originalWidth = 595.28;
      originalHeight = originalWidth * aspectRatio;
    }

    console.log('PDF Page dimensions:', {
      rendered: { width: page.width, height: page.height },
      original: { width: originalWidth, height: originalHeight },
      scale: RENDER_WIDTH / originalWidth
    });

    setPageDimensions({
      widthPts: originalWidth,
      heightPts: originalHeight
    });
  };

  // No PDF selected
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

  return (
    <div className="flex flex-col items-center">
      {/* PDF Container - same structure as idea.txt */}
      <div
        className="relative mx-auto mt-5 shadow-lg"
        style={{
          width: RENDER_WIDTH,
          height: renderedHeight || 'auto',
        }}
      >
        <Document
          key={selectedPdf.id}
          file={selectedPdf.file}
          loading={
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              Chargement…
            </div>
          }
        >
          <Page
            key={`${selectedPdf.id}-${currentPage}`}
            pageNumber={currentPage}
            width={RENDER_WIDTH}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            onLoadSuccess={handlePageLoad}
          />
        </Document>

        {/* Window Overlay - CSS positioned div like idea.txt */}
        {showWindow && overlayStyle && (
          <div
            id="window-overlay"
            className="absolute pointer-events-none z-10"
            style={{
              left: `${overlayStyle.left}px`,
              top: `${overlayStyle.top}px`,
              width: `${overlayStyle.width}px`,
              height: `${overlayStyle.height}px`,
              border: '2px dashed #ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
            }}
          >
            {/* Label at top of rectangle - like idea.txt */}
            <div
              className="absolute whitespace-nowrap"
              style={{
                top: '-24px',
                left: 0,
                background: '#ef4444',
                color: 'white',
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px 4px 0 0',
              }}
            >
              {envelopeLabel}
            </div>
          </div>
        )}

        {/* Dimension info overlay */}
        {/*{showWindow && addressWindow && pageDimensions && (
          <div className="absolute top-1 left-1 text-[8px] bg-black/80 text-white px-1.5 py-1 rounded z-20 leading-tight font-mono">
            <div>Bloc Adresse</div>
            <div>X:{addressWindow.x} Y:{addressWindow.y}mm</div>
            <div>L:{addressWindow.width} H:{addressWindow.height}mm</div>
          </div>
        )}*/}

        {/* Page number indicator */}
        <div className="absolute bottom-2 right-2 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded z-20">
          {currentPage} / {currentNumPages || '?'}
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center space-x-4 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200 mt-4">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="p-1 hover:bg-slate-100 rounded-full disabled:opacity-30 disabled:cursor-not-allowed text-slate-700"
          aria-label="Page précédente"
        >
          <ChevronLeft size={20} />
        </button>

        <span className="text-sm font-medium tabular-nums text-slate-700 min-w-[60px] text-center">
          {currentNumPages ? `${currentPage} / ${currentNumPages}` : "--"}
        </span>

        <button
          onClick={() => onPageChange(Math.min(currentNumPages, currentPage + 1))}
          disabled={currentPage >= currentNumPages}
          className="p-1 hover:bg-slate-100 rounded-full disabled:opacity-30 disabled:cursor-not-allowed text-slate-700"
          aria-label="Page suivante"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* File info */}
      <div className="text-xs text-slate-500 mt-2 text-center max-w-[280px] truncate">
        {fileName} (<span className="font-semibold">{fileLabel}</span>)
      </div>
    </div>
  );
});

PdfViewer.displayName = 'PdfViewer';

export default PdfViewer;
