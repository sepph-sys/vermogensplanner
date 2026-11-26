import type { Deposit } from '../../lib/finance';
import { formatDate } from '../../lib/dates';
import { formatEUR } from '../../lib/format';
import { Card } from '../ui/Card';
import { DateField } from '../ui/DateField';
import { NumberField } from '../ui/NumberField';
import { IconCoins, IconLock, IconPlus, IconTrash, IconWarn } from '../ui/icons';

type Target = 'invest' | 'savings';

interface Props {
  invest: Deposit[];
  savings: Deposit[];
  /** Startinleg beleggen en startsaldo sparen (vaste regels bovenaan). */
  initial: { invest: number; savings: number };
  onInitialChange: (next: { invest: number; savings: number }) => void;
  /** Stortingen die buiten de looptijd vallen, per bestemming. */
  ignored: { invest: Deposit[]; savings: Deposit[] };
  startDate: string;
  colors: { invest: string; savings: string };
  onChange: (next: { invest: Deposit[]; savings: Deposit[] }) => void;
}

const LABEL: Record<Target, string> = { invest: 'Beleggen', savings: 'Sparen' };

let counter = 0;
const newId = () => `d${Date.now().toString(36)}${(counter++).toString(36)}`;

/**
 * Eén tabel met alle eenmalige stortingen voor beleggen én sparen. De kolom
 * 'Bestemming' bepaalt naar welke module een regel gaat; wijzigen verplaatst
 * de regel naar de andere module.
 */
export function DepositsTable({ invest, savings, initial, onInitialChange, ignored, startDate, colors, onChange }: Props) {
  const lists: Record<Target, Deposit[]> = { invest, savings };
  const ignoredIds = new Set([...ignored.invest, ...ignored.savings].map((d) => d.id));

  const rows = [
    ...invest.map((d) => ({ target: 'invest' as const, d })),
    ...savings.map((d) => ({ target: 'savings' as const, d })),
  ].sort((a, b) => a.d.date.localeCompare(b.d.date) || a.target.localeCompare(b.target));

  const emit = (patch: Partial<Record<Target, Deposit[]>>) => onChange({ ...lists, ...patch });

  const update = (target: Target, id: string, patch: Partial<Deposit>) =>
    emit({ [target]: lists[target].map((d) => (d.id === id ? { ...d, ...patch } : d)) });

  const remove = (target: Target, id: string) => emit({ [target]: lists[target].filter((d) => d.id !== id) });

  const move = (from: Target, to: Target, id: string) => {
    if (from === to) return;
    const dep = lists[from].find((d) => d.id === id);
    if (!dep) return;
    emit({ [from]: lists[from].filter((d) => d.id !== id), [to]: [...lists[to], dep] });
  };

  const add = (target: Target) => {
    const year = Number(startDate.slice(0, 4)) + 1;
    emit({ [target]: [...lists[target], { id: newId(), date: `${year}-${startDate.slice(5)}`, amount: 1000, label: '' }] });
  };

  /** Totaal per bestemming, inclusief startbedrag; stortingen buiten de looptijd tellen niet. */
  const total = (t: Target) =>
    initial[t] + lists[t].filter((d) => !ignoredIds.has(d.id)).reduce((s, d) => s + (d.amount || 0), 0);

  const FIXED: { target: Target; label: string }[] = [
    { target: 'invest', label: 'Startinleg' },
    { target: 'savings', label: 'Startsaldo' },
  ];

  return (
    <Card
      title="Eenmalige inleg"
      subtitle="Startbedragen en extra stortingen op een vaste datum, zoals bonus, vakantiegeld of erfenis"
      icon={<IconCoins />}
      actions={
        <div className="btn-row">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => add('invest')}>
            <IconPlus /> Belegging
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => add('savings')}>
            <IconPlus /> Spaarstorting
          </button>
        </div>
      }
    >
        <div className="table-wrap">
          <table className="table edit-table">
            <colgroup>
              <col style={{ width: 150 }} />
              <col style={{ width: 170 }} />
              <col style={{ width: 160 }} />
              <col />
              <col style={{ width: 44 }} />
            </colgroup>
            <thead>
              <tr>
                <th>Bestemming</th>
                <th>Datum</th>
                <th>Bedrag</th>
                <th>Omschrijving</th>
                <th><span className="sr-only">Acties</span></th>
              </tr>
            </thead>
            <tbody>
              {FIXED.map(({ target, label }) => (
                <tr key={`fixed-${target}`} className="row-fixed">
                  <td className="col-target">
                    <span className="target-badge"><span className="swatch" style={{ background: colors[target] }} />{LABEL[target]}</span>
                  </td>
                  <td className="col-date">
                    <span className="fixed-date">{formatDate(startDate)}</span>
                  </td>
                  <td className="col-amount">
                    <NumberField
                      compact
                      hideLabel
                      label={`${label} ${LABEL[target].toLowerCase()}`}
                      prefix="€"
                      value={initial[target]}
                      min={0}
                      step={500}
                      onChange={(v) => onInitialChange({ ...initial, [target]: v })}
                    />
                  </td>
                  <td className="col-label">
                    <span className="fixed-label">{label} {LABEL[target].toLowerCase()}</span>
                    <span className="muted small"> · op de startdatum</span>
                  </td>
                  <td className="col-action">
                    <span className="lock" title="Vaste regel" aria-label="Vaste regel"><IconLock /></span>
                  </td>
                </tr>
              ))}
              {rows.map(({ target, d }) => {
                const out = ignoredIds.has(d.id);
                return (
                  <tr key={d.id} className={out ? 'is-ignored' : ''}>
                    <td className="col-target">
                      <div className="select-wrap" style={{ ['--dot' as string]: colors[target] }}>
                        <select
                          aria-label={`Bestemming storting ${formatDate(d.date)}`}
                          value={target}
                          onChange={(e) => move(target, e.target.value as Target, d.id)}
                        >
                          <option value="invest">Beleggen</option>
                          <option value="savings">Sparen</option>
                        </select>
                      </div>
                    </td>
                    <td className="col-date">
                      <DateField compact hideLabel label={`Datum storting ${LABEL[target]}`} value={d.date} onChange={(date) => update(target, d.id, { date })} />
                    </td>
                    <td className="col-amount">
                      <NumberField compact hideLabel label="Bedrag" prefix="€" value={d.amount} min={0} step={500} onChange={(amount) => update(target, d.id, { amount })} />
                    </td>
                    <td className="col-label">
                      <div className="field field-compact">
                        <label htmlFor={`lbl-${d.id}`} className="sr-only">Omschrijving</label>
                        <div className="input-wrap">
                          <input id={`lbl-${d.id}`} type="text" value={d.label ?? ''} placeholder="bv. bonus" onChange={(e) => update(target, d.id, { label: e.target.value })} />
                        </div>
                      </div>
                      {out && <span className="row-warn"><IconWarn /> Buiten de looptijd – telt niet mee</span>}
                    </td>
                    <td className="col-action">
                      <button type="button" className="icon-btn" aria-label={`Storting van ${formatDate(d.date)} verwijderen`} onClick={() => remove(target, d.id)}>
                        <IconTrash />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              {(['invest', 'savings'] as const).map((t) => (
                <tr key={t}>
                  <th scope="row" colSpan={2}>
                    <span className="swatch" style={{ background: colors[t] }} /> Totaal {LABEL[t].toLowerCase()}
                  </th>
                  <td className="tfoot-amount"><strong>{formatEUR(total(t))}</strong></td>
                  <td colSpan={2} className="muted small">
                    startbedrag + {lists[t].length} {lists[t].length === 1 ? 'storting' : 'stortingen'}
                  </td>
                </tr>
              ))}
            </tfoot>
          </table>
        </div>
    </Card>
  );
}
