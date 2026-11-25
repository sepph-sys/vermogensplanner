import type { SavingsState } from '../../lib/model';
import { Card } from '../ui/Card';
import { NumberField } from '../ui/NumberField';
import { IconPiggy } from '../ui/icons';

interface Props {
  savings: SavingsState;
  monthly: number;
  autoMonthly: boolean;
  onChange: (s: SavingsState) => void;
}

export function SavingsPanel({ savings, monthly, autoMonthly, onChange }: Props) {
  const set = (patch: Partial<SavingsState>) => onChange({ ...savings, ...patch });
  return (
    <Card title="Sparen" subtitle="Spaarrekening of deposito" icon={<IconPiggy />}>
      <div className="grid-2">
        <NumberField label="Startsaldo" prefix="€" value={savings.initial} min={0} step={500} onChange={(initial) => set({ initial })} />
        <NumberField
          label="Maandelijkse inleg"
          prefix="€"
          value={monthly}
          min={0}
          step={25}
          disabled={autoMonthly}
          hint={autoMonthly ? 'Uit maandbudget' : undefined}
          onChange={(m) => set({ monthly: m })}
        />
        <NumberField label="Jaarlijkse spaarrente" suffix="%" value={savings.annualRate} min={-5} max={20} step={0.1} onChange={(annualRate) => set({ annualRate })} />
        <NumberField label="Gem. inflatie" suffix="%" value={savings.inflation} min={-10} max={30} step={0.1} onChange={(inflation) => set({ inflation })} />
      </div>
    </Card>
  );
}
