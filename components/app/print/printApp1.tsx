'use client';
import { useMailStore } from '@/app/store/mailStore';
import { Button } from '@/components/ui/button';
import AnnexList from './AnnexList';
import ColorSelect from './ColorSelect';
import EnvelopeSelect from './EnvelopeSelect';
import FileUploader from './FileUploader';
import PostageSelect from './PostageSelect';
import PrintSideSelect from './PrintSideSelect';

export default function PrintApp() {
  const sourceFile = useMailStore(state => state.sourceFile);
  const annexes = useMailStore(state => state.annexes);
  const setSourceFile = useMailStore(state => state.setSourceFile);
  const addAnnex = useMailStore(state => state.addAnnex);
  const removeAnnex = useMailStore(state => state.removeAnnex);
  const selectPdf = useMailStore(state => state.selectPdf);
  const selectedPdfId = useMailStore(state => state.selectedPdfId);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Dépôt et configuration</h1>

      {/* Upload */}
      <FileUploader onUpload={(file: File) => setSourceFile({ id: 'source', file, url: URL.createObjectURL(file), numPages: 0, Courrier: true })} isSource={true} />
      <FileUploader onUpload={(file: File) => addAnnex({ id: 'annex', file, url: URL.createObjectURL(file), numPages: 0, Courrier: false })} isSource={false} />

      {/* Liste des annexes */}
      <AnnexList
        files={annexes}
        selectedId={selectedPdfId}
        onSelect={selectPdf}
        onRemove={removeAnnex}
      />

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <ColorSelect />
        <PrintSideSelect />
        <EnvelopeSelect />
        <PostageSelect />
      </div>

      {/* Aperçu PDF */}
      <div className="mt-6">
        {/*<PdfPreview />*/}
      </div>

      {/* Submit */}
      <Button className="mt-6 w-full bg-green-600 text-white">VALIDER ET ENVOYER</Button>
    </div>
  );
}
