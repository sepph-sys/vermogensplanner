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

        <div className="table-wrap">
          <table className="table edit-table box3-table">
            <colgroup>
              <col style={{ width: 92 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 190 }} />
              <col style={{ width: 96 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 104 }} />
              <col style={{ width: 104 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 44 }} />
            </colgroup>
            <thead>
              <tr className="group-row">
                <th colSpan={4} />
                <th colSpan={3} className="group">Forfaitair stelsel</th>
                <th colSpan={2} className="group">Werkelijk rendement</th>
                <th />
              </tr>
              <tr>
                <th>Periode</th>
                <th>Vanaf jaar</th>
                <th>Stelsel</th>
                <th>Tarief</th>
                <th>Heffingsvrij vermogen p.p.</th>
                <th>Forfait bank</th>
                <th>Forfait overig</th>
                <th>Heffingsvrij resultaat p.p.</th>
                <th>Verliesdrempel p.p.</th>
                <th><span className="sr-only">Acties</span></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => {
                const next = sorted[i + 1];
                const range = next ? (next.fromYear - 1 > p.fromYear ? `${p.fromYear}–${next.fromYear - 1}` : `${p.fromYear}`) : `${p.fromYear} e.v.`;
                const forf = p.system === 'forfaitair';
                const na = <span className="na" aria-label="niet van toepassing">–</span>;
                return (
                  <tr key={p.id} className={duplicate.has(p.fromYear) ? 'is-ignored' : ''}>
                    <th scope="row" className="col-range">
                      {range}
                      {duplicate.has(p.fromYear) && <span className="row-warn"><IconWarn /> dubbel jaar</span>}
                    </th>
                    <td className="col-year">
                      <NumberField compact hideLabel noGrouping label="Vanaf jaar" decimals={0} min={1900} max={2200} value={p.fromYear} onChange={(fromYear) => setPeriod(p.id, { fromYear: Math.round(fromYear) })} />
                    </td>
                    <td className="col-system">
                      <div className="select-wrap">
                        <select aria-label={`Stelsel vanaf ${p.fromYear}`} value={p.system} onChange={(e) => setPeriod(p.id, { system: e.target.value as Box3System })}>
                          <option value="forfaitair">Forfaitair</option>
                          <option value="werkelijk">Werkelijk rendement</option>
                        </select>
                      </div>
                    </td>
                    <td className="col-pct">
                      <NumberField compact hideLabel label="Tarief" suffix="%" min={0} max={100} step={1} value={p.taxRate} onChange={(taxRate) => setPeriod(p.id, { taxRate })} />
                    </td>
                    <td className="col-eur">
                      {forf ? <NumberField compact hideLabel label="Heffingsvrij vermogen per persoon" prefix="€" decimals={0} min={0} step={500} value={p.exemptAssets} onChange={(exemptAssets) => setPeriod(p.id, { exemptAssets })} /> : na}
                    </td>
                    <td className="col-pct">
                      {forf ? <NumberField compact hideLabel label="Forfait banktegoeden" suffix="%" min={-10} max={30} step={0.01} value={p.rateSavings} onChange={(rateSavings) => setPeriod(p.id, { rateSavings })} /> : na}
                    </td>
                    <td className="col-pct">
                      {forf ? <NumberField compact hideLabel label="Forfait overige bezittingen" suffix="%" min={-10} max={30} step={0.01} value={p.rateOther} onChange={(rateOther) => setPeriod(p.id, { rateOther })} /> : na}
                    </td>
                    <td className="col-eur">
                      {!forf ? <NumberField compact hideLabel label="Heffingsvrij resultaat per persoon" prefix="€" decimals={0} min={0} step={100} value={p.exemptReturn} onChange={(exemptReturn) => setPeriod(p.id, { exemptReturn })} /> : na}
                    </td>
                    <td className="col-eur">
                      {!forf ? <NumberField compact hideLabel label="Verliesdrempel per persoon" prefix="€" decimals={0} min={0} step={100} value={p.lossThreshold} onChange={(lossThreshold) => setPeriod(p.id, { lossThreshold })} /> : na}
                    </td>
                    <td className="col-action">
                      <button
                        type="button"
                        className="icon-btn"
                        disabled={box3.periods.length <= 1}
                        aria-label={`Periode vanaf ${p.fromYear} verwijderen`}
                        onClick={() => set({ periods: box3.periods.filter((x) => x.id !== p.id) })}
                      >
                        <IconTrash />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
