import type { AssumptionsState, PeriodState, YearAssumption } from '../../lib/model';
import { yearOf } from '../../lib/dates';
import { horizonMonths } from '../../lib/finance';
import { formatNumber } from '../../lib/format';
import { Card } from '../ui/Card';
import { NumberField } from '../ui/NumberField';
import { IconCalendar, IconPercent, IconPlus, IconTrash, IconWarn } from '../ui/icons';

interface Props {
  assumptions: AssumptionsState;
  period: PeriodState;
  onChange: (a: AssumptionsState) => void;
}

type Key = 'annualReturn' | 'savingsRate' | 'inflation';

const COLUMNS: { key: Key; label: string; min: number; max: number; step: number }[] = [
  { key: 'annualReturn', label: 'Rendement beleggen', min: -90, max: 100, step: 0.25 },
  { key: 'savingsRate', label: 'Spaarrente', min: -10, max: 30, step: 0.1 },
  { key: 'inflation', label: 'Inflatie', min: -10, max: 50, step: 0.1 },
];

let counter = 0;
const newId = () => `y${Date.now().toString(36)}${(counter++).toString(36)}`;
const emptyYear = (year: number): YearAssumption => ({ id: newId(), year, annualReturn: null, savingsRate: null, inflation: null });

/**
 * Rendement, spaarrente en inflatie – één bron voor de hele app.
 * Bovenaan de generieke waarden; in de tabel optionele afwijkingen per
 * kalenderjaar. Een leeg veld in de tabel betekent: generieke waarde.
 */
export function AssumptionsPanel({ assumptions: a, period, onChange }: Props) {
  const set = (patch: Partial<AssumptionsState>) => onChange({ ...a, ...patch });
  const setYear = (id: string, patch: Partial<YearAssumption>) =>
    set({ years: a.years.map((y) => (y.id === id ? { ...y, ...patch } : y)) });

  const firstYear = yearOf(period.startDate);
  const months = horizonMonths(period.startDate, period.endDate);
  // Laatste kalenderjaar met minstens één maand in de looptijd.
  const lastYear = months > 0 ? firstYear + Math.floor((Number(period.startDate.slice(5, 7)) - 1 + months - 1) / 12) : firstYear;

  const sorted = [...a.years].sort((x, y) => x.year - y.year);
  const years = sorted.map((y) => y.year);
  const duplicate = new Set(years.filter((y, i) => years.indexOf(y) !== i));

  const addYear = () => {
    const next = years.length ? Math.max(...years) + 1 : firstYear;
    set({ years: [...a.years, emptyYear(next)] });
  };

  const fillPeriod = () => {
    const have = new Set(years);
    const extra: YearAssumption[] = [];
    for (let y = firstYear; y <= lastYear; y++) if (!have.has(y)) extra.push(emptyYear(y));
    set({ years: [...a.years, ...extra] });
  };

  const generic: Record<Key, number> = { annualReturn: a.annualReturn, savingsRate: a.savingsRate, inflation: a.inflation };
  const overrides = a.years.filter((y) => y.annualReturn !== null || y.savingsRate !== null || y.inflation !== null).length;

  return (
    <>
      <Card
        title="Generieke aannames"
        subtitle="Gelden voor elk jaar zonder eigen waarde in de tabel hieronder. Overal in de app wordt deze ene waarde gebruikt."
        icon={<IconPercent />}
      >
        <div className="grid-3">
          <NumberField label="Gem. jaarrendement beleggen" suffix="%" value={a.annualReturn} min={-50} max={50} step={0.25} hint="Effectief, na kosten" onChange={(annualReturn) => set({ annualReturn })} />
          <NumberField label="Spaarrente" suffix="%" value={a.savingsRate} min={-5} max={20} step={0.1} hint="Effectief per jaar" onChange={(savingsRate) => set({ savingsRate })} />
          <NumberField label="Inflatie" suffix="%" value={a.inflation} min={-10} max={30} step={0.1} hint="Voor reële waarde, indexatie en box 3" onChange={(inflation) => set({ inflation })} />
        </div>
      </Card>

      <Card
        title="Waarden per jaar"
        subtitle={`Afwijkingen per kalenderjaar. Een leeg veld = generieke waarde. ${overrides} ${overrides === 1 ? 'jaar' : 'jaren'} met afwijking.`}
        icon={<IconCalendar />}
        actions={
          <div className="btn-row">
            <button type="button" className="btn btn-ghost btn-sm" onClick={addYear}>
              <IconPlus /> Jaar
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={fillPeriod} title={`Regels voor ${firstYear}–${lastYear}`}>
              <IconPlus /> Alle jaren looptijd
            </button>
            {a.years.length > 0 && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => set({ years: [] })}>
                <IconTrash /> Alles wissen
              </button>
            )}
          </div>
        }
      >
        {sorted.length === 0 ? (
          <p className="muted small">
            Nog geen afwijkende jaren: elk jaar gebruikt de generieke waarden. Voeg een jaar toe, of ‘Alle jaren looptijd’ om
            {` ${firstYear}–${lastYear}`} jaar voor jaar in te vullen.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="table edit-table years-table">
              <colgroup>
                <col style={{ width: 110 }} />
                <col />
                <col />
                <col />
                <col style={{ width: 44 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Jaar</th>
                  {COLUMNS.map((c) => (
                    <th key={c.key}>
                      {c.label} <span className="th-sub">generiek {formatNumber(generic[c.key])}%</span>
                    </th>
                  ))}
                  <th><span className="sr-only">Acties</span></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((y) => {
                  const out = y.year < firstYear || y.year > lastYear;
                  const dup = duplicate.has(y.year);
                  return (
                    <tr key={y.id} className={out || dup ? 'is-ignored' : ''}>
                      <td>
                        <NumberField compact hideLabel noGrouping label="Jaar" decimals={0} min={1900} max={2200} value={y.year} onChange={(year) => setYear(y.id, { year: Math.round(year) })} />
                        {out && <span className="row-warn"><IconWarn /> buiten looptijd</span>}
                        {dup && <span className="row-warn"><IconWarn /> dubbel jaar</span>}
                      </td>
                      {COLUMNS.map((c) => (
                        <td key={c.key} className={y[c.key] !== null ? 'is-set' : undefined}>
                          <NumberField
                            compact
                            hideLabel
                            label={`${c.label} ${y.year}`}
                            suffix="%"
                            value={y[c.key]}
                            min={c.min}
                            max={c.max}
                            step={c.step}
                            placeholder={`${formatNumber(generic[c.key])} (generiek)`}
                            onChange={(v) => setYear(y.id, { [c.key]: v })}
                            onClear={() => setYear(y.id, { [c.key]: null })}
                          />
                        </td>
                      ))}
                      <td className="col-action">
                        <button type="button" className="icon-btn" aria-label={`Jaar ${y.year} verwijderen`} onClick={() => set({ years: a.years.filter((x) => x.id !== y.id) })}>
                          <IconTrash />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted small table-note">
          Waarden gelden per kalenderjaar (januari–december). Scenario’s tellen hun afwijking op bij de waarde van elk jaar.
          Bij dubbele jaren telt de onderste regel.
        </p>
      </Card>
    </>
  );
}
