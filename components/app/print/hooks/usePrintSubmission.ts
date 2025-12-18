import { useSession } from 'next-auth/react';
import { useCallback, useState } from 'react';
import { MailOptions, PDFFile, PrintSubmissionPayload } from '../types';

interface UsePrintSubmissionReturn {
  isSubmitting: boolean;
  error: string | null;
  submit: (
    sourceFile: PDFFile,
    annexes: PDFFile[],
    options: MailOptions,
    totalPages: number
  ) => Promise<boolean>;
}

export function usePrintSubmission(): UsePrintSubmissionReturn {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (
    sourceFile: PDFFile,
    annexes: PDFFile[],
    options: MailOptions,
    totalPages: number
  ): Promise<boolean> => {
    if (!sourceFile) {
      setError("Veuillez charger le Courrier.");
      return false;
    }

    if (!session?.user) {
      setError("Session expirée. Veuillez vous reconnecter.");
      return false;
    }

    setIsSubmitting(true);
    setError(null);

    const filesToSend = [sourceFile, ...annexes];
    const uniqueKey = Date.now();

    // Build JSON payload with session data
    const jsonPayload: PrintSubmissionPayload = {
      meta: {
        flux: 'simpaap',
        submissionDate: new Date().toISOString(),
        client: session.user.tenantSlug || 'unknown',
        user: session.user.email || 'unknown',
        totalFiles: filesToSend.length,
        totalPages: totalPages,
        uniqueKey: uniqueKey,
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

      // Add files with their exact ID as name
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
        throw new Error(result.error || "Erreur lors de l'upload");
      }

      // Clean up blob URLs after success
      filesToSend.forEach(pdf => URL.revokeObjectURL(pdf.url));

      setIsSubmitting(false);
      return true;

    } catch (err: unknown) {
      console.error("--- ERREUR UPLOAD ---", err);
      const message = err instanceof Error ? err.message : "Erreur inattendue";
      setError(message);
      setIsSubmitting(false);
      return false;
    }
  }, [session]);

  return {
    isSubmitting,
    error,
    submit,
  };
}
