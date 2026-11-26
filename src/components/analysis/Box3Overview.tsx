import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';
import { runModel, type ModelResult, type PlannerState } from '../../lib/model';
import type { Box3YearResult } from '../../lib/box3';
import type { ChartColors } from '../../lib/chartTheme';
import { formatEUR, formatEURCompact, formatEURSigned, formatPct } from '../../lib/format';
import { Card } from '../ui/Card';
import { Stat } from '../ui/Stat';
import { IconScale } from '../ui/icons';

interface Props {
  state: PlannerState;
  model: ModelResult;
  colors: ChartColors;
}

const SYSTEM_LABEL = { forfaitair: 'Forfaitair', werkelijk: 'Werkelijk rendement' } as const;

/** Overzicht van de box 3-druk: totaal, effect op eindvermogen en per jaar. */
export function Box3Overview({ state, model, colors }: Props) {
  const untaxed = useMemo(() => runModel(state, { noTax: true }), [state]);
  const years = model.taxYears;
  const tax = model.totals.tax;
  const effect = model.totals.final - untaxed.totals.final;
  const effectPct = untaxed.totals.final > 0 ? effect / untaxed.totals.final : 0;
  const growthUntaxed = untaxed.totals.final - untaxed.totals.contributed;
  const taxedYears = years.filter((y) => y.tax > 0).length;

  const data = years.map((y) => ({
    year: y.year,
    forfaitair: y.system === 'forfaitair' ? y.tax : 0,
    werkelijk: y.system === 'werkelijk' ? y.tax : 0,
    row: y,
  }));
  const systems = new Set(years.map((y) => y.system));

  if (!state.box3.enabled) {
    return (
      <Card title="Box 3-belasting" subtitle="Staat uit – alle bedragen zijn vóór belasting" icon={<IconScale />}>
        <p className="muted small">Zet box 3 aan in het invoerpaneel om de vermogensrendementsheffing mee te rekenen.</p>
      </Card>
    );
  }

  return (
    <Card
      title="Box 3-belasting"
      subtitle={`${state.box3.persons === 2 ? 'Fiscale partners' : 'Alleenstaand'} · belasting wordt per kalenderjaar uit het vermogen betaald`}
      icon={<IconScale />}
    >
      <div className="stat-grid stat-grid-4">
        <Stat label="Totaal betaald" value={formatEUR(tax)} tone={tax > 0 ? 'negative' : 'default'} sub={`${taxedYears} van ${years.length} jaar belast`} />
        <Stat label="Eindvermogen zonder box 3" value={formatEUR(untaxed.totals.final)} />
        <Stat
          label="Effect op eindvermogen"
          value={formatEURSigned(effect)}
          tone={effect < 0 ? 'negative' : 'default'}
          sub={`${formatPct(effectPct)} · incl. gemiste groei`}
        />
        <Stat
          label="Belastingdruk op groei"
          value={formatPct(growthUntaxed > 0 ? -effect / growthUntaxed : 0)}
          sub="deel van het bruto rendement"
        />
      </div>

      {years.length > 0 && (
        <>
          <ul className="legend legend-spaced">
            {systems.has('forfaitair') && (
              <li><span className="legend-mark" style={{ background: colors.invest, borderColor: colors.invest }} /><span className="legend-name">Forfaitair stelsel</span></li>
            )}
            {systems.has('werkelijk') && (
              <li><span className="legend-mark" style={{ background: colors.total, borderColor: colors.total }} /><span className="legend-name">Werkelijk rendement</span></li>
            )}
          </ul>
          <div className="chart" role="img" aria-label="Staafdiagram van box 3-belasting per jaar">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }} barCategoryGap="18%">
                <CartesianGrid vertical={false} stroke={colors.grid} />
                <XAxis dataKey="year" stroke={colors.axis} tickLine={false} tick={{ fill: colors.tick, fontSize: 12 }} minTickGap={16} />
                <YAxis tickFormatter={formatEURCompact} width={76} axisLine={false} tickLine={false} tick={{ fill: colors.tick, fontSize: 12 }} />
                <Tooltip cursor={{ fill: colors.grid, opacity: 0.5 }} content={<TaxTooltip />} />
                <Bar dataKey="forfaitair" stackId="t" fill={colors.invest} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                <Bar dataKey="werkelijk" stackId="t" fill={colors.total} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <details className="details">
            <summary>Berekening per jaar</summary>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Jaar</th>
                    <th>Stelsel</th>
                    <th className="num">Grondslag</th>
                    <th className="num">Belastbaar</th>
                    <th className="num">Belasting</th>
                    <th>Toelichting</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map((y) => (
                    <tr key={y.year}>
                      <th scope="row">{y.year}</th>
                      <td>{SYSTEM_LABEL[y.system]}</td>
                      <td className="num">{formatEUR(y.base)}</td>
                      <td className="num">{formatEUR(y.taxable)}</td>
                      <td className="num"><strong>{formatEUR(y.tax)}</strong></td>
                      <td className="muted small">{note(y)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted small">
              Grondslag = vermogen op de peildatum (forfaitair) of werkelijk resultaat (werkelijk rendement). Deeljaren aan het
              begin en einde van de looptijd worden in het forfaitaire stelsel naar rato belast.
            </p>
          </details>
        </>
      )}
    </Card>
  );
}

function note(y: Box3YearResult): string {
  const parts: string[] = [];
  if (y.months < 12) parts.push(`deeljaar (${y.months} mnd)`);
  if (y.indexed) parts.push(`vrijstelling geïndexeerd: ${formatEUR(y.exemption)}`);
  if (y.counterEvidenceUsed) parts.push('tegenbewijs toegepast');
  if (y.system === 'werkelijk' && y.base < 0) parts.push('negatief resultaat');
  if (y.system === 'werkelijk' && y.lossCarry > 0) parts.push(`verrekenbaar verlies ${formatEUR(y.lossCarry)}`);
  return parts.join(' · ') || '–';
}

function TaxTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const y = (payload[0].payload as { row: Box3YearResult }).row;
  return (
    <div className="tooltip">
      <div className="tooltip-title">{y.year} · {SYSTEM_LABEL[y.system]}</div>
      <div className="tooltip-row"><span /><span>{y.system === 'forfaitair' ? 'Vermogen peildatum' : 'Werkelijk resultaat'}</span><strong>{formatEUR(y.base)}</strong></div>
      <div className="tooltip-row"><span /><span>Belastbaar</span><strong>{formatEUR(y.taxable)}</strong></div>
      <div className="tooltip-row"><span /><span>Box 3-belasting</span><strong>{formatEUR(y.tax)}</strong></div>
      {note(y) !== '–' && <div className="tooltip-foot">{note(y)}</div>}
    </div>
  );
}
