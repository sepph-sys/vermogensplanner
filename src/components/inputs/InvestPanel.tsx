import type { InvestState } from '../../lib/model';
import { Card } from '../ui/Card';
import { NumberField } from '../ui/NumberField';
import { IconTrend } from '../ui/icons';

interface Props {
  invest: InvestState;
  monthly: number;
  autoMonthly: boolean;
  onChange: (i: InvestState) => void;
}

export function InvestPanel({ invest, monthly, autoMonthly, onChange }: Props) {
  const set = (patch: Partial<InvestState>) => onChange({ ...invest, ...patch });

  return (
    <Card title="Beleggen" subtitle="Indexfondsen, ETF's of aandelen" icon={<IconTrend />}>
      <div className="grid-2">
        <NumberField label="Startinleg" prefix="€" value={invest.initial} min={0} step={500} onChange={(initial) => set({ initial })} />
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
        <NumberField label="Gem. jaarrendement" suffix="%" value={invest.annualReturn} min={-50} max={50} step={0.25} hint="Effectief, na kosten" onChange={(annualReturn) => set({ annualReturn })} />
        <NumberField label="Gem. inflatie" suffix="%" value={invest.inflation} min={-10} max={30} step={0.1} onChange={(inflation) => set({ inflation })} />
      </div>

    </Card>
  );
}
