import { useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import type { ModelResult } from '../../lib/model';
import type { ChartColors } from '../../lib/chartTheme';
import { addMonths, formatMonth, yearOf } from '../../lib/dates';
import { formatEUR, formatEURCompact } from '../../lib/format';
import { Card } from '../ui/Card';
import { Segmented } from '../ui/Segmented';
import { IconLayers } from '../ui/icons';

interface Props {
  model: ModelResult;
  startDate: string;
  colors: ChartColors;
}

type Mode = 'nominal' | 'real';

interface Row {
  month: number;
  invest: number;
  savings: number;
  total: number;
  contributed: number;
}

const MAX_POINTS = 240;

/** Bouw grafiekrijen; bij lange looptijden wordt gesampled (laatste punt altijd mee). */
function buildRows(model: ModelResult, mode: Mode): Row[] {
  const inv = model.invest.points;
  const sav = model.savings.points;
  const n = inv.length - 1;
  const step = Math.max(1, Math.ceil(n / MAX_POINTS));
  const rows: Row[] = [];
  for (let m = 0; m <= n; m += step) rows.push(row(m));
  if (rows[rows.length - 1]?.month !== n) rows.push(row(n));
  return rows;

  function row(m: number): Row {
    const i = mode === 'real' ? inv[m].real : inv[m].balance;
    const s = mode === 'real' ? sav[m].real : sav[m].balance;
    return { month: m, invest: i, savings: s, total: i + s, contributed: inv[m].contributed + sav[m].contributed };
  }
}

/** Jaarticks met een stapgrootte die past bij de looptijd. */
function yearTicks(n: number): number[] {
  const years = n / 12;
  const step = years <= 10 ? 1 : years <= 20 ? 2 : years <= 50 ? 5 : 10;
  const ticks: number[] = [];
  for (let m = 0; m <= n; m += step * 12) ticks.push(m);
  return ticks;
}

export function GrowthChart({ model, startDate, colors }: Props) {
  const [mode, setMode] = useState<Mode>('nominal');
  const rows = useMemo(() => buildRows(model, mode), [model, mode]);
  const n = model.invest.months;
  const last = rows[rows.length - 1];

  const series = [
    { key: 'invest' as const, name: 'Beleggingen', color: colors.invest },
    { key: 'savings' as const, name: 'Sparen', color: colors.savings },
    { key: 'total' as const, name: 'Totaal vermogen', color: colors.total },
    ...(mode === 'nominal' ? [{ key: 'contributed' as const, name: 'Eigen inleg', color: colors.contributed, dashed: true }] : []),
  ];

  return (
    <Card
      title="Vermogensontwikkeling"
      subtitle={mode === 'real' ? 'Koopkrachtgecorrigeerd, in euro’s van de startdatum' : 'Nominale waarde per maand'}
      icon={<IconLayers />}
      actions={
        <Segmented
          ariaLabel="Weergave"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'nominal', label: 'Nominaal' },
            { value: 'real', label: 'Reëel' },
          ]}
        />
      }
    >
      {/* Legenda met eindwaarden – identiteit nooit alleen via kleur */}
      <ul className="legend">
        {series.map((s) => (
          <li key={s.key}>
            <span className={`legend-mark${'dashed' in s ? ' dashed' : ''}`} style={{ borderColor: s.color, background: 'dashed' in s ? 'transparent' : s.color }} />
            <span className="legend-name">{s.name}</span>
            <span className="legend-value">{last ? formatEUR(last[s.key]) : '–'}</span>
          </li>
        ))}
      </ul>

      <div className="chart" role="img" aria-label={`Lijngrafiek van vermogensontwikkeling over ${Math.round(n / 12)} jaar`}>
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={rows} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
            <defs>
              {(['invest', 'savings'] as const).map((k) => (
                <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors[k]} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={colors[k]} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke={colors.grid} />
            <XAxis
              dataKey="month"
              type="number"
              domain={[0, n]}
              ticks={yearTicks(n)}
              tickFormatter={(m: number) => String(yearOf(addMonths(startDate, m)))}
              stroke={colors.axis}
              tick={{ fill: colors.tick, fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatEURCompact}
              width={76}
              axisLine={false}
              tickLine={false}
              tick={{ fill: colors.tick, fontSize: 12 }}
            />
            <Tooltip
              cursor={{ stroke: colors.axis, strokeWidth: 1 }}
              content={<GrowthTooltip startDate={startDate} series={series} />}
            />
            <Area type="monotone" dataKey="invest" name="Beleggingen" stroke={colors.invest} strokeWidth={2} fill="url(#grad-invest)" isAnimationActive={false} activeDot={{ r: 4, stroke: colors.surface, strokeWidth: 2 }} />
            <Area type="monotone" dataKey="savings" name="Sparen" stroke={colors.savings} strokeWidth={2} fill="url(#grad-savings)" isAnimationActive={false} activeDot={{ r: 4, stroke: colors.surface, strokeWidth: 2 }} />
            <Line type="monotone" dataKey="total" name="Totaal vermogen" stroke={colors.total} strokeWidth={2.5} dot={false} isAnimationActive={false} activeDot={{ r: 5, stroke: colors.surface, strokeWidth: 2 }} />
            {mode === 'nominal' && (
              <Line type="monotone" dataKey="contributed" name="Eigen inleg" stroke={colors.contributed} strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} activeDot={false} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

interface TooltipExtra {
  startDate: string;
  series: { key: keyof Row; name: string; color: string }[];
}

function GrowthTooltip({ active, payload, startDate, series }: TooltipProps<number, string> & TooltipExtra) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as Row;
  return (
    <div className="tooltip">
      <div className="tooltip-title">{formatMonth(addMonths(startDate, row.month))}</div>
      {series.map((s) => (
        <div className="tooltip-row" key={s.key}>
          <span className="swatch" style={{ background: s.color }} />
          <span>{s.name}</span>
          <strong>{formatEUR(row[s.key])}</strong>
        </div>
      ))}
      {series.some((s) => s.key === 'contributed') && (
        <div className="tooltip-foot">Groei: {formatEUR(row.total - row.contributed)}</div>
      )}
    </div>
  );
}
