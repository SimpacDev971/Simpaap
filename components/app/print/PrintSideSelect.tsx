// --- /components/SelectOptions/PrintSideSelect.tsx ---

'use client';


import { useMailStore } from '@/app/store/mailStore';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PrintSideSelect = () => {
  const options = useMailStore(state => state.options);
  const setOptions = useMailStore(state => state.setOptions);
  
  return (
    <div className="space-y-1">
      <Label htmlFor="side-select">Type d'impression</Label>
      <Select value={options.side} onValueChange={(v) => setOptions({ side: v as 'recto' | 'recto_verso' })}>
        <SelectTrigger>
          <SelectValue placeholder="Sélectionner le côté" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="recto">Recto seul</SelectItem>
          <SelectItem value="recto_verso">Recto / Verso</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default PrintSideSelect;