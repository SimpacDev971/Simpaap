// --- /components/SelectOptions/PostageSelect.tsx ---

'use client';


import { useMailStore } from '@/app/store/mailStore';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const POSTAGE_TYPES = [
  { value: 'economique', label: 'Économique' },
  { value: 'rapide', label: 'Rapide' },
  { value: 'recommande', label: 'Recommandé' }
];

const POSTAGE_SPEEDS = [
  { value: 'J+1', label: 'J+1' },
  { value: 'J+2', label: 'J+2' },
  { value: 'J+3', label: 'J+3' }
];

const PostageSelect = () => {
  const options = useMailStore(state => state.options);
  const setOptions = useMailStore(state => state.setOptions);
  
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="postage-type-select">Gamme</Label>
        <Select value={options.postageType} onValueChange={(v) => setOptions({ postageType: v as 'recommande' | 'economique' | 'rapide' })}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner la gamme" />
          </SelectTrigger>
          <SelectContent>
            {POSTAGE_TYPES.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-1">
        <Label htmlFor="postage-speed-select">Délai</Label>
        <Select value={options.postageSpeed} onValueChange={(v) => setOptions({ postageSpeed: v as 'J+1' | 'J+2' | 'J+3' })}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner le délai" />
          </SelectTrigger>
          <SelectContent>
            {POSTAGE_SPEEDS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default PostageSelect;