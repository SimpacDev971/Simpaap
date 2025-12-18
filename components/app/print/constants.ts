import { MailOptions, PrintOption, EnvelopeOption } from './types';

// Default mail options when no database values are loaded
export const DEFAULT_OPTIONS: MailOptions = {
  color: 'noir_blanc',
  side: 'recto',
  envelope: 'C6/5',
  postageType: 'economique',
  postageSpeed: 'J+3'
};

// Fallback options if tenant has no configured options
export const FALLBACK_COLORS: PrintOption[] = [
  { id: 0, value: 'noir_blanc', label: 'Noir et Blanc', isActive: true, sortOrder: 0 },
  { id: 0, value: 'couleur', label: 'Couleur', isActive: true, sortOrder: 1 },
];

export const FALLBACK_SIDES: PrintOption[] = [
  { id: 0, value: 'recto', label: 'Recto seul', isActive: true, sortOrder: 0 },
  { id: 0, value: 'recto_verso', label: 'Recto / Verso', isActive: true, sortOrder: 1 },
];

export const FALLBACK_ENVELOPES: EnvelopeOption[] = [
  { id: 0, value: 'C6/5', label: 'C6/5 (Format classique - plié en 3)', description: null, isActive: true, sortOrder: 0 },
  { id: 0, value: 'C5', label: 'C5 (Demi A4 - plié en 2)', description: null, isActive: true, sortOrder: 1 },
  { id: 0, value: 'C4', label: 'C4 (Grand format A4 - non plié)', description: null, isActive: true, sortOrder: 2 },
];

export const FALLBACK_POSTAGE_TYPES: PrintOption[] = [
  { id: 0, value: 'economique', label: 'Économique (Ecopli)', isActive: true, sortOrder: 0 },
  { id: 0, value: 'rapide', label: 'Rapide (Lettre Verte / Prioritaire)', isActive: true, sortOrder: 1 },
  { id: 0, value: 'recommande', label: 'Recommandé (LRAR)', isActive: true, sortOrder: 2 },
];

export const FALLBACK_POSTAGE_SPEEDS: PrintOption[] = [
  { id: 0, value: 'J+1', label: 'J+1 (Urgent)', isActive: true, sortOrder: 0 },
  { id: 0, value: 'J+2', label: 'J+2 (Standard)', isActive: true, sortOrder: 1 },
  { id: 0, value: 'J+3', label: 'J+3 (Éco)', isActive: true, sortOrder: 2 },
];

// Price constants
export const PRICE_PER_PAGE = 0.15;
export const PRICE_PER_DOCUMENT = 1.20;
