import { createDefaultBox3, type Box3Config, type Box3Period, type Box3System } from '../../lib/box3';
import { formatNumber } from '../../lib/format';
import { Card } from '../ui/Card';
import { NumberField } from '../ui/NumberField';
import { Segmented } from '../ui/Segmented';
import { IconPlus, IconReset, IconScale, IconTrash, IconWarn } from '../ui/icons';

interface Props {
  box3: Box3Config;
  /** Inflatie-aanname (beleggen) voor de indexatie van heffingsvrije bedragen. */
  inflation: number;
  onChange: (b: Box3Config) => void;
}

let counter = 0;
const newId = () => `p${Date.now().toString(36)}${(counter++).toString(36)}`;

/**
 * Box 3-parameters. Elke periode geldt vanaf haar jaar tot de volgende
 * periode; de laatste periode geldt voor alle latere jaren.
 */
export function Box3Panel({ box3, inflation, onChange }: Props) {
  const set = (patch: Partial<Box3Config>) => onChange({ ...box3, ...patch });
  const setPeriod = (id: string, patch: Partial<Box3Period>) =>
    set({ periods: box3.periods.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

  const sorted = [...box3.periods].sort((a, b) => a.fromYear - b.fromYear);
  const years = sorted.map((p) => p.fromYear);
  const duplicate = new Set(years.filter((y, i) => years.indexOf(y) !== i));

  const addPeriod = () => {
    const last = sorted[sorted.length - 1];
    const base = last ?? createDefaultBox3().periods[0];
    set({ periods: [...box3.periods, { ...base, id: newId(), fromYear: (last?.fromYear ?? 2026) + 1 }] });
  };

  return (
    <Card title="Box 3-belasting" subtitle="Spaargeld en beleggingen als enige box 3-bezittingen" icon={<IconScale />}>
      <label className="switch">
        <input type="checkbox" checked={box3.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
        <span className="switch-track" aria-hidden="true" />
        <span>Box 3 meenemen in de berekening</span>
      </label>

      <fieldset className="fieldset" disabled={!box3.enabled}>
        <div className="row-between">
          <Segmented<'1' | '2'>
            ariaLabel="Aangifte"
            value={String(box3.persons) as '1' | '2'}
            onChange={(v) => set({ persons: v === '2' ? 2 : 1 })}
            options={[
              { value: '1', label: 'Alleenstaand' },
              { value: '2', label: 'Fiscale partners' },
            ]}
          />
        </div>
        <label className="checkbox">
          <input type="checkbox" checked={box3.counterEvidence} onChange={(e) => set({ counterEvidence: e.target.checked })} />
          <span>Tegenbewijsregeling in forfaitaire jaren</span>
        </label>
        <div>
          <label className="checkbox">
            <input type="checkbox" checked={box3.indexExemptions} onChange={(e) => set({ indexExemptions: e.target.checked })} />
            <span>Heffingsvrije bedragen na {years.length ? Math.max(...years) : '–'} jaarlijks indexeren met inflatie</span>
          </label>
          <p className="field-hint checkbox-hint">
            Jaren na de laatste periode gebruiken de waarden van die periode
            {box3.indexExemptions ? `; het heffingsvrij vermogen/resultaat stijgt met de inflatie van beleggen (${formatNumber(inflation)}% per jaar).` : ', zonder indexatie.'}
          </p>
        </div>

        <div className="periods">
          {sorted.map((p, i) => {
            const next = sorted[i + 1];
            const range = next ? (next.fromYear - 1 > p.fromYear ? `${p.fromYear}–${next.fromYear - 1}` : `${p.fromYear}`) : `${p.fromYear} e.v.`;
            return (
              <fieldset key={p.id} className={`period${duplicate.has(p.fromYear) ? ' is-invalid' : ''}`}>
                <legend className="period-head">
                  <span className="period-range">{range}</span>
                </legend>
                <div className="period-top">
                  <NumberField compact noGrouping label="Vanaf jaar" decimals={0} min={1900} max={2200} value={p.fromYear} onChange={(fromYear) => setPeriod(p.id, { fromYear: Math.round(fromYear) })} />
                  <div className="field field-compact">
                    <span className="field-label">Stelsel</span>
                    <Segmented<Box3System>
                      ariaLabel={`Stelsel vanaf ${p.fromYear}`}
                      value={p.system}
                      onChange={(system) => setPeriod(p.id, { system })}
                      options={[
                        { value: 'forfaitair', label: 'Forfaitair' },
                        { value: 'werkelijk', label: 'Werkelijk' },
                      ]}
                    />
                  </div>
                  <button
                    type="button"
                    className="icon-btn"
                    disabled={box3.periods.length <= 1}
                    aria-label={`Periode vanaf ${p.fromYear} verwijderen`}
                    onClick={() => set({ periods: box3.periods.filter((x) => x.id !== p.id) })}
                  >
                    <IconTrash />
                  </button>
                </div>
                {p.system === 'forfaitair' ? (
                  <div className="grid-2">
                    <NumberField compact label="Heffingsvrij vermogen p.p." prefix="€" decimals={0} min={0} step={500} value={p.exemptAssets} onChange={(exemptAssets) => setPeriod(p.id, { exemptAssets })} />
                    <NumberField compact label="Tarief" suffix="%" min={0} max={100} step={1} value={p.taxRate} onChange={(taxRate) => setPeriod(p.id, { taxRate })} />
                    <NumberField compact label="Forfait banktegoeden" suffix="%" min={-10} max={30} step={0.01} value={p.rateSavings} onChange={(rateSavings) => setPeriod(p.id, { rateSavings })} />
                    <NumberField compact label="Forfait overige bezittingen" suffix="%" min={-10} max={30} step={0.01} value={p.rateOther} onChange={(rateOther) => setPeriod(p.id, { rateOther })} />
                  </div>
                ) : (
                  <div className="grid-2">
                    <NumberField compact label="Heffingsvrij resultaat p.p." prefix="€" decimals={0} min={0} step={100} value={p.exemptReturn} onChange={(exemptReturn) => setPeriod(p.id, { exemptReturn })} />
                    <NumberField compact label="Tarief" suffix="%" min={0} max={100} step={1} value={p.taxRate} onChange={(taxRate) => setPeriod(p.id, { taxRate })} />
                    <NumberField compact label="Verliesdrempel p.p." prefix="€" decimals={0} min={0} step={100} value={p.lossThreshold} onChange={(lossThreshold) => setPeriod(p.id, { lossThreshold })} />
                  </div>
                )}
                {duplicate.has(p.fromYear) && (
                  <p className="deposit-warn"><IconWarn /> Meerdere perioden starten in {p.fromYear}.</p>
                )}
              </fieldset>
            );
          })}
        </div>

        <div className="row-between">
          <button type="button" className="btn btn-ghost btn-sm" onClick={addPeriod}>
            <IconPlus /> Periode toevoegen
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => set({ periods: createDefaultBox3().periods })}>
            <IconReset /> Standaard 2026–2028
          </button>
        </div>
        <p className="muted small">
          Stand november 2026. De cijfers voor 2027 en het spaarforfait zijn voorlopig. Het kabinet heeft voorgesteld het
          werkelijk-rendementstelsel uit te stellen naar 2029: zet daarvoor ‘Vanaf jaar’ van de laatste periode op 2029.
        </p>
      </fieldset>
    </Card>
  );
}
