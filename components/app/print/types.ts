// Types for the Print Application

export interface PrintOption {
  id: number;
  value: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
}

export interface EnvelopeOption extends PrintOption {
  description: string | null;
}

export interface PrintOptions {
  colors: PrintOption[];
  sides: PrintOption[];
  envelopes: EnvelopeOption[];
  postageTypes: PrintOption[];
  postageSpeeds: PrintOption[];
}

export interface MailOptions {
  color: string;
  side: string;
  envelope: string;
  postageType: string;
  postageSpeed: string;
}

export interface PDFFile {
  id: string;
  file: File;
  url: string;
  numPages: number;
  Courrier: boolean;
}

export type ActiveFileArea = 'source' | 'annexes';

export type PrintStep = 'upload' | 'config' | 'success';

export interface PrintSubmissionMeta {
  flux: string;
  submissionDate: string;
  client: string;
  user: string;
  totalFiles: number;
  totalPages: number;
  uniqueKey: number;
  files: {
    id: string;
    originfilename: string;
    pages: number;
    size: number;
    isCourrier: boolean;
    order: number;
  }[];
}

export interface PrintSubmissionPayload {
  meta: PrintSubmissionMeta;
  productionOptions: {
    print: {
      color: boolean;
      duplex: boolean;
    };
    finishing: {
      envelope: string;
      insertType: string;
    };
    logistics: {
      carrier: string;
      productCode: string;
      serviceLevel: string;
    };
  };
}
