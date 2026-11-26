import {
  FREQUENCY_LABEL,
  FREQUENCY_UNIT,
  isRecurring,
  monthlyEquivalent,
  type Contribution,
  type Frequency,
  type IndexMode,
  type Target,
} from '../../lib/contributions';
import { formatDMY } from '../../lib/dates';
import { formatEUR } from '../../lib/format';
import { Card } from '../ui/Card';
import { DateField } from '../ui/DateField';
import { NumberField } from '../ui/NumberField';
import { IconCoins, IconLock, IconPlus, IconTrash, IconWarn } from '../ui/icons';

interface Props {
  rows: Contribution[];
  /** Startinleg beleggen en startsaldo sparen (vaste regels bovenaan). */
  initial: { invest: number; savings: number };
  onInitialChange: (next: { invest: number; savings: number }) => void;
  /** Regels zonder storting binnen de looptijd. */
  ignored: Contribution[];
  startDate: string;
  colors: { invest: string; savings: string };
  onChange: (rows: Contribution[]) => void;
}

const LABEL: Record<Target, string> = { invest: 'Beleggen', savings: 'Sparen' };
const FREQUENCIES: Frequency[] = ['once', 'daily', 'monthly', 'quarterly', 'yearly'];

let counter = 0;
const newId = () => `c${Date.now().toString(36)}${(counter++).toString(36)}`;

/**
 * Alle inleg in één tabel: vaste startregels, periodieke inleg (dagelijks,
 * maandelijks, per kwartaal, per jaar – optioneel geïndexeerd) en eenmalige
 * stortingen, elk naar beleggen of sparen.
 */
export function ContributionsTable({ rows, initial, onInitialChange, ignored, startDate, colors, onChange }: Props) {
  const ignoredIds = new Set(ignored.map((r) => r.id));
  const update = (id: string, patch: Partial<Contribution>) => onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => onChange(rows.filter((r) => r.id !== id));

  const add = (frequency: Frequency) => {
    const year = Number(startDate.slice(0, 4)) + 1;
    onChange([
      ...rows,
      {
        id: newId(),
        target: 'invest',
        frequency,
        date: frequency === 'once' ? `${year}-${startDate.slice(5)}` : startDate,
        endDate: null,
        amount: frequency === 'once' ? 1000 : 100,
        index: 'none',
        indexRate: 2,
        label: '',
      },
    ]);
  };

  // Alleen op datum sorteren (stabiel), zodat een regel niet verspringt als je bestemming of frequentie wijzigt.
  const byDate = (a: Contribution, b: Contribution) => a.date.localeCompare(b.date);
  const recurring = rows.filter(isRecurring).sort(byDate);
  const oneOff = rows.filter((r) => !isRecurring(r)).sort(byDate);

  const totals = (t: Target) => ({
    lump: initial[t] + oneOff.filter((r) => r.target === t && !ignoredIds.has(r.id)).reduce((s, r) => s + (r.amount || 0), 0),
    monthly: recurring.filter((r) => r.target === t && !ignoredIds.has(r.id)).reduce((s, r) => s + monthlyEquivalent(r), 0),
  });

  const renderRow = (r: Contribution) => {
    const out = ignoredIds.has(r.id);
    const rec = isRecurring(r);
    return (
      <tr key={r.id} className={out ? 'is-ignored' : ''}>
        <td>
          <div className="select-wrap" style={{ ['--dot' as string]: colors[r.target] }}>
            <select aria-label="Bestemming" value={r.target} onChange={(e) => update(r.id, { target: e.target.value as Target })}>
              <option value="invest">Beleggen</option>
              <option value="savings">Sparen</option>
            </select>
          </div>
        </td>
        <td>
          <div className="select-wrap">
            <select aria-label="Frequentie" value={r.frequency} onChange={(e) => update(r.id, { frequency: e.target.value as Frequency })}>
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>{FREQUENCY_LABEL[f]}</option>
              ))}
            </select>
          </div>
        </td>
        <td>
          <DateField compact hideLabel label={rec ? 'Vanaf' : 'Datum'} value={r.date} onChange={(date) => update(r.id, { date })} />
        </td>
        <td>
          {rec ? (
            <DateField
              compact
              hideLabel
              allowEmpty
              placeholder="einde looptijd"
              label="Tot en met"
              value={r.endDate ?? ''}
              min={r.date}
              onChange={(v) => update(r.id, { endDate: v || null })}
            />
          ) : (
            <span className="na">–</span>
          )}
        </td>
        <td>
          <NumberField compact hideLabel label="Bedrag" prefix="€" value={r.amount} min={0} step={rec ? 25 : 500} onChange={(amount) => update(r.id, { amount })} />
          {rec && r.frequency !== 'monthly' && r.amount > 0 && (
            <span className="cell-sub">{FREQUENCY_UNIT[r.frequency]} · ≈ {formatEUR(monthlyEquivalent(r))} p/m</span>
          )}
        </td>
        <td>
          {rec ? (
            <>
              <div className="select-wrap">
                <select aria-label="Indexatie" value={r.index} onChange={(e) => update(r.id, { index: e.target.value as IndexMode })}>
                  <option value="none">Geen</option>
                  <option value="inflation">Inflatie</option>
                  <option value="custom">Eigen %</option>
                </select>
              </div>
              {r.index === 'custom' && (
                <div className="cell-stack">
                  <NumberField compact hideLabel label="Indexatie per jaar" suffix="% /jr" value={r.indexRate} min={-10} max={30} step={0.25} onChange={(indexRate) => update(r.id, { indexRate })} />
                </div>
              )}
            </>
          ) : (
            <span className="na">–</span>
          )}
        </td>
        <td>
          <div className="field field-compact">
            <label htmlFor={`lbl-${r.id}`} className="sr-only">Omschrijving</label>
            <div className="input-wrap">
              <input id={`lbl-${r.id}`} type="text" value={r.label ?? ''} placeholder={rec ? 'bv. maandelijkse inleg' : 'bv. bonus'} onChange={(e) => update(r.id, { label: e.target.value })} />
            </div>
          </div>
          {out && <span className="row-warn"><IconWarn /> Geen storting binnen de looptijd – telt niet mee</span>}
        </td>
        <td className="col-action">
          <button type="button" className="icon-btn" aria-label={`Regel ${r.label || FREQUENCY_LABEL[r.frequency]} verwijderen`} onClick={() => remove(r.id)}>
            <IconTrash />
          </button>
        </td>
      </tr>
    );
  };

  return (
    <Card
      title="Inleg"
      subtitle="Startbedragen, periodieke inleg en eenmalige stortingen naar beleggen of sparen"
      icon={<IconCoins />}
      actions={
        <div className="btn-row">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => add('monthly')}>
            <IconPlus /> Periodieke inleg
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => add('once')}>
            <IconPlus /> Eenmalige storting
          </button>
        </div>
      }
    >
      <div className="table-wrap">
        <table className="table edit-table contrib-table">
          <colgroup>
            <col style={{ width: 140 }} />
            <col style={{ width: 148 }} />
            <col style={{ width: 160 }} />
            <col style={{ width: 160 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 132 }} />
            <col />
            <col style={{ width: 44 }} />
          </colgroup>
          <thead>
            <tr>
              <th>Bestemming</th>
              <th>Frequentie</th>
              <th>Datum / vanaf</th>
              <th>T/m</th>
              <th>Bedrag</th>
              <th>Indexatie</th>
              <th>Omschrijving</th>
              <th><span className="sr-only">Acties</span></th>
            </tr>
          </thead>
          <tbody>
            <tr className="group-head"><th colSpan={8}>Startbedragen</th></tr>
            {(['invest', 'savings'] as const).map((t) => (
              <tr key={`fixed-${t}`} className="row-fixed">
                <td><span className="target-badge"><span className="swatch" style={{ background: colors[t] }} />{LABEL[t]}</span></td>
                <td><span className="fixed-date">Eenmalig</span></td>
                <td><span className="fixed-date">{formatDMY(startDate)}</span></td>
                <td><span className="na">–</span></td>
                <td>
                  <NumberField compact hideLabel label={t === 'invest' ? 'Startinleg beleggen' : 'Startsaldo sparen'} prefix="€" value={initial[t]} min={0} step={500} onChange={(v) => onInitialChange({ ...initial, [t]: v })} />
                </td>
                <td><span className="na">–</span></td>
                <td><span className="fixed-label">{t === 'invest' ? 'Startinleg beleggen' : 'Startsaldo sparen'}</span><span className="muted small"> · op de startdatum</span></td>
                <td className="col-action"><span className="lock" title="Vaste regel" aria-label="Vaste regel"><IconLock /></span></td>
              </tr>
            ))}

            <tr className="group-head"><th colSpan={8}>Periodieke inleg</th></tr>
            {recurring.length ? recurring.map(renderRow) : (
              <tr><td colSpan={8} className="muted small empty-row">Geen periodieke inleg. Voeg een regel toe met ‘Periodieke inleg’.</td></tr>
            )}

            <tr className="group-head"><th colSpan={8}>Eenmalige stortingen</th></tr>
            {oneOff.length ? oneOff.map(renderRow) : (
              <tr><td colSpan={8} className="muted small empty-row">Geen eenmalige stortingen.</td></tr>
            )}
          </tbody>
          <tfoot>
            {(['invest', 'savings'] as const).map((t) => {
              const tt = totals(t);
              return (
                <tr key={t}>
                  <th scope="row" colSpan={4}>
                    <span className="swatch" style={{ background: colors[t] }} /> Totaal {LABEL[t].toLowerCase()}
                  </th>
                  <td className="tfoot-amount"><strong>{formatEUR(tt.lump)}</strong></td>
                  <td colSpan={3} className="muted small">
                    start + eenmalig · periodiek ≈ <strong>{formatEUR(tt.monthly)}</strong> per maand
                  </td>
                </tr>
              );
            })}
          </tfoot>
        </table>
      </div>
      <p className="muted small table-note">
        Periodieke inleg start op de datum ‘vanaf’ en herhaalt tot en met ‘t/m’ (leeg = tot het einde van de looptijd).
        Dagelijkse inleg wordt per maand opgeteld. Indexatie verhoogt het bedrag elk jaar op de verjaardag van de startdatum
        van de regel – met de inflatie (tabblad Rendement &amp; inflatie) of een eigen percentage.
      </p>
    </Card>
  );
}
