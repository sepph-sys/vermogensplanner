import type { BudgetState } from '../../lib/model';
import { formatEUR } from '../../lib/format';
import { Card } from '../ui/Card';
import { NumberField } from '../ui/NumberField';
import { IconWallet } from '../ui/icons';

interface Props {
  budget: BudgetState;
  colors: { invest: string; savings: string };
  onChange: (b: BudgetState) => void;
}

const PRESETS = [
  { label: '100/0', share: 100 },
  { label: '80/20', share: 80 },
  { label: '70/30', share: 70 },
  { label: '50/50', share: 50 },
  { label: '0/100', share: 0 },
];

/**
 * Eén vrij besteedbaar maandbedrag, verdeeld tussen beleggen en sparen.
 * Bij 'automatisch verdelen' worden de maandinleggen van beide modules
 * hieruit afgeleid en herberekent alles direct.
 */
export function BudgetPanel({ budget, colors, onChange }: Props) {
  const invest = (budget.amount * budget.investShare) / 100;
  const savings = budget.amount - invest;
  const set = (patch: Partial<BudgetState>) => onChange({ ...budget, ...patch });

  return (
    <Card title="Maandbudget" subtitle="Vrij besteedbaar per maand" icon={<IconWallet />}>
      <label className="switch">
        <input type="checkbox" checked={budget.autoSplit} onChange={(e) => set({ autoSplit: e.target.checked })} />
        <span className="switch-track" aria-hidden="true" />
        <span>Verdeel automatisch over sparen en beleggen</span>
      </label>

      <fieldset className="fieldset" disabled={!budget.autoSplit}>
        <NumberField label="Beschikbaar per maand" prefix="€" value={budget.amount} min={0} step={50} decimals={2} onChange={(amount) => set({ amount })} />

        <div className="split">
          <div className="split-head">
            <span><span className="swatch" style={{ background: colors.invest }} /> Beleggen <strong>{Math.round(budget.investShare)}%</strong></span>
            <span>Sparen <strong>{Math.round(100 - budget.investShare)}%</strong> <span className="swatch" style={{ background: colors.savings }} /></span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={budget.investShare}
            aria-label="Percentage naar beleggen"
            onChange={(e) => set({ investShare: Number(e.target.value) })}
            style={{ ['--fill' as string]: `${budget.investShare}%`, ['--c1' as string]: colors.invest, ['--c2' as string]: colors.savings }}
          />
          <div className="split-values">
            <span>{formatEUR(invest)}<small>/mnd</small></span>
            <span>{formatEUR(savings)}<small>/mnd</small></span>
          </div>
          <div className="chips" role="group" aria-label="Verdeling beleggen/sparen">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className={`chip${Math.round(budget.investShare) === p.share ? ' active' : ''}`}
                onClick={() => set({ investShare: p.share })}
              >
                {p.label}
              </button>
            ))}
          </div>
          <NumberField label="Percentage naar beleggen" suffix="%" value={budget.investShare} min={0} max={100} step={5} decimals={1} compact onChange={(investShare) => set({ investShare })} />
        </div>
      </fieldset>
      {!budget.autoSplit && <p className="muted small">Handmatige modus: stel de maandinleg per module hieronder in.</p>}
    </Card>
  );
}
