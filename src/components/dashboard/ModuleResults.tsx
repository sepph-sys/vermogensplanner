import type { ModelResult } from '../../lib/model';
import type { ChartColors } from '../../lib/chartTheme';
import { formatEUR, formatEURSigned, formatPct, formatPctSigned } from '../../lib/format';
import { Card } from '../ui/Card';
import { Stat } from '../ui/Stat';
import { IconPiggy, IconTrend } from '../ui/icons';

interface Props {
  model: ModelResult;
  colors: ChartColors;
}

/** Resultaten per module, zoals gevraagd: inleg, rendement/rente, eindwaarde, reëel. */
export function ModuleResults({ model, colors }: Props) {
  const { invest, savings } = model;
  const investRealGain = invest.realFinal - invest.totalContributed;

  /** "€ 700 per maand" of "€ 700 per maand · +2,5%/jr → € 1.428" */
  /** "≈ € 700 per maand" of "≈ € 700 per maand → € 1.432 in het laatste jaar" */
  const monthlyLabel = (first: number, last: number) =>
    `≈ ${formatEUR(first)} per maand${Math.abs(last - first) > 1 ? ` → ${formatEUR(last)} in het laatste jaar` : ''}`;
  return (
    <div className="grid-2 modules">
      <Card title="Resultaat beleggen" subtitle={monthlyLabel(model.monthlyInvest, model.lastMonthlyInvest)} icon={<IconTrend />} className="accent-invest" >
        <div className="stat-grid">
          <Stat label="Totale inleg" value={formatEUR(invest.totalContributed)} />
          <Stat
            label={invest.taxPaid > 0 ? 'Rendement na box 3' : 'Behaald rendement'}
            value={formatEURSigned(invest.totalGrowth)}
            tone={invest.totalGrowth >= 0 ? 'positive' : 'negative'}
            sub={`${formatPctSigned(invest.growthPct)} op inleg${invest.taxPaid > 0 ? ` · ${formatEUR(invest.taxPaid)} box 3` : ''}`}
          />
          <Stat label="Eindvermogen" value={formatEUR(invest.finalBalance)} swatch={colors.invest} emphasis />
          <Stat label="Reële eindwaarde" value={formatEUR(invest.realFinal)} sub={`${formatEURSigned(investRealGain)} reëel t.o.v. inleg`} />
        </div>
        <ReturnBar contributed={invest.totalContributed} growth={invest.totalGrowth} color={colors.invest} label="rendement" />
      </Card>

      <Card title="Resultaat sparen" subtitle={monthlyLabel(model.monthlySavings, model.lastMonthlySavings)} icon={<IconPiggy />} className="accent-savings">
        <div className="stat-grid">
          <Stat label="Totale inleg" value={formatEUR(savings.totalContributed)} />
          <Stat
            label={savings.taxPaid > 0 ? 'Rente na box 3' : 'Ontvangen rente'}
            value={formatEURSigned(savings.totalGrowth)}
            tone={savings.totalGrowth >= 0 ? 'positive' : 'negative'}
            sub={`${formatPctSigned(savings.growthPct)} op inleg${savings.taxPaid > 0 ? ` · ${formatEUR(savings.taxPaid)} box 3` : ''}`}
          />
          <Stat label="Eindsaldo" value={formatEUR(savings.finalBalance)} swatch={colors.savings} emphasis />
          <Stat
            label="Reële eindwaarde"
            value={formatEUR(savings.realFinal)}
            tone={savings.realFinal < savings.totalContributed ? 'negative' : 'default'}
            sub={savings.realFinal < savings.totalContributed ? 'Minder koopkracht dan ingelegd' : `${formatEURSigned(savings.realFinal - savings.totalContributed)} reëel t.o.v. inleg`}
          />
        </div>
        <ReturnBar contributed={savings.totalContributed} growth={savings.totalGrowth} color={colors.savings} label="rente" />
      </Card>
    </div>
  );
}

/** Horizontale verhoudingsbalk inleg vs. groei. */
function ReturnBar({ contributed, growth, color, label }: { contributed: number; growth: number; color: string; label: string }) {
  const total = contributed + Math.max(growth, 0);
  const c = total > 0 ? contributed / total : 1;
  return (
    <div className="ratio">
      <div className="ratio-bar" aria-hidden="true">
        <span style={{ width: `${c * 100}%`, background: 'var(--neutral-fill)' }} />
        <span style={{ width: `${(1 - c) * 100}%`, background: color }} />
      </div>
      <div className="ratio-legend">
        <span>Inleg {formatPct(c)}</span>
        <span>{label[0].toUpperCase() + label.slice(1)} {formatPct(1 - c)}</span>
      </div>
    </div>
  );
}
