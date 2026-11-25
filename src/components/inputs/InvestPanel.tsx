import type { InvestState } from '../../lib/model';
import type { Deposit } from '../../lib/finance';
import { formatDate } from '../../lib/dates';
import { Card } from '../ui/Card';
import { NumberField } from '../ui/NumberField';
import { DateField } from '../ui/DateField';
import { IconPlus, IconTrash, IconTrend, IconWarn } from '../ui/icons';

interface Props {
  invest: InvestState;
  monthly: number;
  autoMonthly: boolean;
  startDate: string;
  ignored: Deposit[];
  onChange: (i: InvestState) => void;
}

let counter = 0;
const newId = () => `d${Date.now().toString(36)}${(counter++).toString(36)}`;

export function InvestPanel({ invest, monthly, autoMonthly, startDate, ignored, onChange }: Props) {
  const set = (patch: Partial<InvestState>) => onChange({ ...invest, ...patch });
  const ignoredIds = new Set(ignored.map((d) => d.id));

  const updateDeposit = (id: string, patch: Partial<Deposit>) =>
    set({ deposits: invest.deposits.map((d) => (d.id === id ? { ...d, ...patch } : d)) });

  const addDeposit = () => {
    const year = Number(startDate.slice(0, 4)) + 1;
    set({ deposits: [...invest.deposits, { id: newId(), date: `${year}-${startDate.slice(5)}`, amount: 1000, label: '' }] });
  };

  const sorted = [...invest.deposits].sort((a, b) => a.date.localeCompare(b.date));

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

      <div className="subsection">
        <div className="subsection-head">
          <h3>Extra eenmalige stortingen</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={addDeposit}>
            <IconPlus /> Toevoegen
          </button>
        </div>
        {sorted.length === 0 && <p className="muted small">Nog geen extra stortingen. Denk aan bonussen, een erfenis of vakantiegeld.</p>}
        <ul className="deposits">
          {sorted.map((d) => (
            <li key={d.id} className={ignoredIds.has(d.id) ? 'is-ignored' : ''}>
              <DateField label="Datum" compact value={d.date} onChange={(date) => updateDeposit(d.id, { date })} />
              <NumberField label="Bedrag" compact prefix="€" value={d.amount} min={0} step={500} onChange={(amount) => updateDeposit(d.id, { amount })} />
              <div className="field field-compact deposit-label">
                <label htmlFor={`lbl-${d.id}`}>Omschrijving</label>
                <div className="input-wrap">
                  <input id={`lbl-${d.id}`} type="text" value={d.label ?? ''} placeholder="bv. bonus" onChange={(e) => updateDeposit(d.id, { label: e.target.value })} />
                </div>
              </div>
              <button type="button" className="icon-btn" aria-label={`Storting van ${formatDate(d.date)} verwijderen`} onClick={() => set({ deposits: invest.deposits.filter((x) => x.id !== d.id) })}>
                <IconTrash />
              </button>
              {ignoredIds.has(d.id) && (
                <p className="deposit-warn"><IconWarn /> Valt buiten de looptijd en telt niet mee.</p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
