import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';
import { runModel, type PlannerState, type ScenarioDef } from '../../lib/model';
import type { ChartColors } from '../../lib/chartTheme';
import { formatEUR, formatEURCompact, formatNumber, formatPctSigned } from '../../lib/format';
import { Card } from '../ui/Card';
import { NumberField } from '../ui/NumberField';

interface Props {
  state: PlannerState;
  colors: ChartColors;
  onScenariosChange: (s: ScenarioDef[]) => void;
}

const signedPp = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${formatNumber(Math.abs(v), 2)} pp`;

/**
 * Drie scenario's als afwijking (in procentpunten) op de ingevoerde
 * aannames. 'Realistisch' = exact de huidige invoer (standaard ±0).
 */
export function ScenarioComparison({ state, colors, onScenariosChange }: Props) {
  const results = useMemo(
    () =>
      state.scenarios.map((s) => {
        const m = runModel(state, { returnDelta: s.returnDelta, savingsDelta: s.savingsDelta, inflationDelta: s.inflationDelta });
        return { def: s, nominal: m.totals.final, real: m.totals.real, contributed: m.totals.contributed };
      }),
    [state],
  );
  const reference = results.find((r) => r.def.id === 'realistisch') ?? results[1];

  const update = (id: ScenarioDef['id'], patch: Partial<ScenarioDef>) =>
    onScenariosChange(state.scenarios.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const data = results.map((r) => ({ name: r.def.name, nominal: r.nominal, real: r.real }));

  return (
    <Card title="Scenariovergelijking" subtitle="Eindvermogen en reële waarde bij andere rendements- en inflatieaannames">
      <ul className="legend">
        <li><span className="legend-mark" style={{ background: colors.invest, borderColor: colors.invest }} /><span className="legend-name">Eindvermogen (nominaal)</span></li>
        <li><span className="legend-mark" style={{ background: colors.savings, borderColor: colors.savings }} /><span className="legend-name">Reële waarde</span></li>
      </ul>
      <div className="chart" role="img" aria-label="Staafdiagram van eindvermogen en reële waarde per scenario">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }} barGap={2} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke={colors.grid} />
            <XAxis dataKey="name" stroke={colors.axis} tickLine={false} tick={{ fill: colors.tick, fontSize: 12 }} />
            <YAxis tickFormatter={formatEURCompact} width={76} axisLine={false} tickLine={false} tick={{ fill: colors.tick, fontSize: 12 }} />
            <Tooltip cursor={{ fill: colors.grid, opacity: 0.5 }} content={<BarTooltip colors={colors} />} />
            <Bar dataKey="nominal" name="Eindvermogen" fill={colors.invest} radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive={false} />
            <Bar dataKey="real" name="Reële waarde" fill={colors.savings} radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Scenario</th>
              <th>Rendement</th>
              <th>Spaarrente</th>
              <th>Inflatie</th>
              <th className="num">Eindvermogen</th>
              <th className="num">Reëel</th>
              <th className="num">t.o.v. realistisch</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => {
              const diff = reference.nominal > 0 ? r.nominal / reference.nominal - 1 : 0;
              return (
                <tr key={r.def.id} className={r.def.id === 'realistisch' ? 'row-ref' : ''}>
                  <th scope="row">{r.def.name}</th>
                  <td>{formatNumber(state.invest.annualReturn + r.def.returnDelta)}% <small className="muted">{signedPp(r.def.returnDelta)}</small></td>
                  <td>{formatNumber(state.savings.annualRate + r.def.savingsDelta)}% <small className="muted">{signedPp(r.def.savingsDelta)}</small></td>
                  <td>{formatNumber(state.invest.inflation + r.def.inflationDelta)}% <small className="muted">{signedPp(r.def.inflationDelta)}</small></td>
                  <td className="num"><strong>{formatEUR(r.nominal)}</strong></td>
                  <td className="num">{formatEUR(r.real)}</td>
                  <td className={`num ${diff > 0 ? 'tone-positive' : diff < 0 ? 'tone-negative' : 'muted'}`}>{r.def.id === 'realistisch' ? 'referentie' : formatPctSigned(diff)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <details className="details">
        <summary>Scenario-aannames aanpassen</summary>
        <p className="muted small">Afwijkingen in procentpunten ten opzichte van je invoer. Inflatie wordt op beide modules toegepast.</p>
        <div className="scenario-edit">
          {state.scenarios.map((s) => (
            <fieldset key={s.id} className="scenario-box">
              <legend>{s.name}</legend>
              <NumberField compact label="Rendement" suffix="pp" step={0.5} min={-30} max={30} value={s.returnDelta} onChange={(v) => update(s.id, { returnDelta: v })} />
              <NumberField compact label="Spaarrente" suffix="pp" step={0.25} min={-10} max={10} value={s.savingsDelta} onChange={(v) => update(s.id, { savingsDelta: v })} />
              <NumberField compact label="Inflatie" suffix="pp" step={0.25} min={-10} max={10} value={s.inflationDelta} onChange={(v) => update(s.id, { inflationDelta: v })} />
            </fieldset>
          ))}
        </div>
      </details>
    </Card>
  );
}

function BarTooltip({ active, payload, label, colors }: TooltipProps<number, string> & { colors: ChartColors }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as { nominal: number; real: number };
  return (
    <div className="tooltip">
      <div className="tooltip-title">{label}</div>
      <div className="tooltip-row"><span className="swatch" style={{ background: colors.invest }} /><span>Eindvermogen</span><strong>{formatEUR(row.nominal)}</strong></div>
      <div className="tooltip-row"><span className="swatch" style={{ background: colors.savings }} /><span>Reële waarde</span><strong>{formatEUR(row.real)}</strong></div>
    </div>
  );
}
