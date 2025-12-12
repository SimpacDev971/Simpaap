// --- /components/SelectOptions/EnvelopeSelect.tsx ---

'use client';


import { useMailStore } from '@/app/store/mailStore';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ENVELOPE_TYPES = [
  { value: 'C6/5', label: 'C6/5 (plié en 3)' },
  { value: 'C5', label: 'C5 (plié en 2)' },
  { value: 'C4', label: 'C4 (non plié)' }
];

const EnvelopeSelect = () => {
  const options = useMailStore(state => state.options);
  const setOptions = useMailStore(state => state.setOptions);
  
  return (
    <div className="space-y-1">
      <Label htmlFor="envelope-select">Format d'enveloppe</Label>
      <Select value={options.envelope} onValueChange={(v) => setOptions({ envelope: v as 'C6/5' | 'C5' | 'C4' })}>
        <SelectTrigger>
          <SelectValue placeholder="Sélectionner le format" />
        </SelectTrigger>
        <SelectContent>
          {ENVELOPE_TYPES.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default EnvelopeSelect;