import { useMemo } from 'react';
import { runModel, type ModelResult, type PlannerState } from '../../lib/model';
import type { ChartColors } from '../../lib/chartTheme';
import { addMonths, formatMonth } from '../../lib/dates';
import { inflationFactor } from '../../lib/finance';
import { formatDuration, formatEUR, formatEURSigned, formatPct } from '../../lib/format';
import { Card } from '../ui/Card';
import { IconBulb } from '../ui/icons';

interface Props {
  state: PlannerState;
  model: ModelResult;
  colors: ChartColors;
}

const BOOSTS = [0, 0.1, 0.25, 0.5];

/** Veilige opnameratio voor de FIRE-indicatie (de bekende '4%-regel'). */
const SWR = 0.04;

export function Insights({ state, model, colors }: Props) {
  const { totals } = model;
  const months = model.invest.months;

  const ownShare = totals.final > 0 ? totals.contributed / totals.final : 0;
  const growthShare = 1 - ownShare;
  const purchasingPowerLoss = totals.final > 0 ? totals.inflationLoss / totals.final : 0;
  const thousandToday = 1000 * inflationFactor(state.invest.inflation, months);

  // Effect van hogere maandelijkse inleg (op beide modules).
  const boosts = useMemo(
    () => BOOSTS.map((b) => ({ b, m: b === 0 ? model : runModel(state, { monthlyFactor: 1 + b }) })),
    [state, model],
  );
  const maxBoost = boosts[boosts.length - 1].m.totals.final || 1;

  const fireMonthlyReal = (totals.real * SWR) / 12;
  const crossover = model.invest.crossoverMonth;

  return (
    <Card title="Financiële inzichten" subtitle="Waar komt je vermogen vandaan, en wat levert extra inleg op?" icon={<IconBulb />}>
      <div className="insights">
        <div className="insight">
          <h3>Herkomst van je vermogen</h3>
          <div className="ratio ratio-lg">
            <div className="ratio-bar" aria-hidden="true">
              <span style={{ width: `${Math.max(ownShare, 0) * 100}%`, background: 'var(--neutral-fill)' }} />
              <span style={{ width: `${Math.max(growthShare, 0) * 100}%`, background: colors.total }} />
            </div>
          </div>
          <dl className="kv">
            <div><dt><span className="swatch" style={{ background: 'var(--neutral-fill)' }} />Eigen inleg</dt><dd>{formatPct(ownShare)} <small>{formatEUR(totals.contributed)}</small></dd></div>
            <div><dt><span className="swatch" style={{ background: colors.total }} />Rendement en rente</dt><dd>{formatPct(growthShare)} <small>{formatEUR(totals.growth)}</small></dd></div>
          </dl>
          <p className="muted small">
            {growthShare > 0.5
              ? 'Het grootste deel van je eindvermogen komt uit samengestelde groei, niet uit je eigen inleg.'
              : 'Je eigen inleg is nog de grootste bron van je vermogen; een langere looptijd laat de groei sterker meetellen.'}
          </p>
        </div>

        <div className="insight">
          <h3>Inflatie-impact</h3>
          <dl className="kv">
            <div><dt>Nominaal eindvermogen</dt><dd>{formatEUR(totals.final)}</dd></div>
            <div><dt>Koopkracht in euro’s van nu</dt><dd>{formatEUR(totals.real)}</dd></div>
            <div><dt>Verlies aan koopkracht</dt><dd className="tone-negative">{formatEURSigned(-totals.inflationLoss)} <small>{formatPct(purchasingPowerLoss)}</small></dd></div>
          </dl>
          <p className="muted small">
            Bij {state.invest.inflation.toLocaleString('nl-NL')}% inflatie kost wat nu € 1.000 kost over {formatDuration(months)} ongeveer {formatEUR(thousandToday)}.
          </p>
        </div>

        <div className="insight">
          <h3>FIRE-indicatie</h3>
          <dl className="kv">
            <div><dt>Duurzaam maandinkomen (4%-regel)</dt><dd>{formatEUR(fireMonthlyReal)} <small>/mnd, reëel</small></dd></div>
            <div>
              <dt>Rendement &gt; maandinleg</dt>
              <dd>{crossover ? <>{formatMonth(addMonths(state.period.startDate, crossover))} <small>na {formatDuration(crossover)}</small></> : <small>niet binnen looptijd</small>}</dd>
            </div>
          </dl>
          <p className="muted small">
            Vanaf het kantelpunt verdient je beleggingsportefeuille per maand meer dan je zelf inlegt. De 4%-regel is een vuistregel, geen garantie.
          </p>
        </div>
      </div>

      <div className="subsection">
        <h3>Effect van hogere maandelijkse inleg</h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Inleg</th>
                <th className="num">Per maand</th>
                <th className="num">Eindvermogen</th>
                <th className="hide-sm">Vergelijking</th>
                <th className="num">Extra vermogen</th>
                <th className="num">Extra inleg</th>
                <th className="num">Reëel</th>
              </tr>
            </thead>
            <tbody>
              {boosts.map(({ b, m }) => {
                const extra = m.totals.final - model.totals.final;
                const extraIn = m.totals.contributed - model.totals.contributed;
                return (
                  <tr key={b} className={b === 0 ? 'row-ref' : ''}>
                    <th scope="row">{b === 0 ? 'Huidig' : `+${b * 100}%`}</th>
                    <td className="num">{formatEUR(m.monthlyInvest + m.monthlySavings)}</td>
                    <td className="num"><strong>{formatEUR(m.totals.final)}</strong></td>
                    <td className="hide-sm">
                      <div className="mini-bar" aria-hidden="true"><span style={{ width: `${(m.totals.final / maxBoost) * 100}%`, background: colors.invest }} /></div>
                    </td>
                    <td className={`num ${extra > 0 ? 'tone-positive' : 'muted'}`}>{b === 0 ? '–' : formatEURSigned(extra)}</td>
                    <td className="num muted">{b === 0 ? '–' : formatEURSigned(extraIn)}</td>
                    <td className="num">{formatEUR(m.totals.real)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {boosts[1] && boosts[1].m.totals.contributed > model.totals.contributed && (
          <p className="muted small">
            Elke extra ingelegde euro groeit in dit plan uit tot gemiddeld{' '}
            <strong>{((boosts[1].m.totals.final - model.totals.final) / (boosts[1].m.totals.contributed - model.totals.contributed)).toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' })}</strong>.
          </p>
        )}
      </div>
    </Card>
  );
}
