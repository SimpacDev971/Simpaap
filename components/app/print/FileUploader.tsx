// --- /components/FileUploader/FileUploader.tsx ---

'use client';

import React from 'react';

import { Button } from '@/components/ui/button';

interface FileUploaderProps {
  onUpload: (file: File) => void;
  isSource?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onUpload, isSource = true }) => {
  const inputRef = React.useRef<HTMLInputElement>(null); // Type de référence corrigé
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { // Typage d'événement corrigé
    if (!e.target.files) return;
    
    // Le composant gère l'itération si plusieurs fichiers sont glissés/sélectionnés
    Array.from(e.target.files).forEach(file => onUpload(file));
  };
  
  return (
    // Note: Le code JSX original était incomplet, il manque l'input:
    <>
      <input
        type="file"
        ref={inputRef}
        onChange={handleChange}
        style={{ display: 'none' }}
        multiple={!isSource} // Permet la sélection multiple uniquement pour les annexes
        accept="application/pdf"
      />
      <Button onClick={() => inputRef.current?.click()}>
        {isSource ? 'Ajouter un courrier' : 'Ajouter une annexe'}
      </Button>
    </>
  );
};

export default FileUploader;