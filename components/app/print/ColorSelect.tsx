// --- /components/SelectOptions/ColorSelect.tsx ---

'use client';


import { useMailStore } from '@/app/store/mailStore';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ColorSelect = () => {
  // Sélectionne uniquement les parties du store nécessaires
  const options = useMailStore(state => state.options);
  const setOptions = useMailStore(state => state.setOptions);
  
  return (
    <div className="space-y-1">
      <Label htmlFor="color-select">Mode couleur</Label>
      <Select value={options.color} onValueChange={(v) => setOptions({ color: v as 'noir_blanc' | 'couleur' })}>
        <SelectTrigger>
          <SelectValue placeholder="Sélectionner le mode" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="noir_blanc">Noir et Blanc</SelectItem>
          <SelectItem value="couleur">Couleur</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default ColorSelect;