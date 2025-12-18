import { useSubdomain } from '@/hooks/useSubdomain';
import { useCallback, useEffect, useState } from 'react';
import {
  FALLBACK_COLORS,
  FALLBACK_ENVELOPES,
  FALLBACK_POSTAGE_SPEEDS,
  FALLBACK_POSTAGE_TYPES,
  FALLBACK_SIDES,
} from '../constants';
import { EnvelopeOption, PrintOption, PrintOptions } from '../types';

interface UsePrintOptionsReturn {
  colors: PrintOption[];
  sides: PrintOption[];
  envelopes: EnvelopeOption[];
  postageTypes: PrintOption[];
  postageSpeeds: PrintOption[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePrintOptions(): UsePrintOptionsReturn {
  const subdomain = useSubdomain();
  const [options, setOptions] = useState<PrintOptions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOptions = useCallback(async () => {
    if (!subdomain || subdomain === 'default') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/print-options?subdomain=${subdomain}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch print options: ${response.statusText}`);
      }

      const data: PrintOptions = await response.json();
      setOptions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching print options:', err);
    } finally {
      setIsLoading(false);
    }
  }, [subdomain]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  // Return options or fallbacks if empty
  return {
    colors: options?.colors?.length ? options.colors : FALLBACK_COLORS,
    sides: options?.sides?.length ? options.sides : FALLBACK_SIDES,
    envelopes: options?.envelopes?.length ? options.envelopes : FALLBACK_ENVELOPES,
    postageTypes: options?.postageTypes?.length ? options.postageTypes : FALLBACK_POSTAGE_TYPES,
    postageSpeeds: options?.postageSpeeds?.length ? options.postageSpeeds : FALLBACK_POSTAGE_SPEEDS,
    isLoading,
    error,
    refetch: fetchOptions,
  };
}
