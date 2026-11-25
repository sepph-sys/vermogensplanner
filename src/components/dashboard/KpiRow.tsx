import type { ModelResult } from '../../lib/model';
import type { ChartColors } from '../../lib/chartTheme';
import { formatEUR, formatEURSigned, formatPct } from '../../lib/format';
import { Stat } from '../ui/Stat';

interface Props {
  model: ModelResult;
  colors: ChartColors;
}

/** Bovenste rij kerncijfers van het dashboard. */
export function KpiRow({ model, colors }: Props) {
  const { invest, savings, totals } = model;
  const share = totals.final > 0 ? invest.finalBalance / totals.final : 0;
  return (
    <div className="kpi-row">
      <div className="card kpi">
        <Stat label="Belegd vermogen" swatch={colors.invest} value={formatEUR(invest.finalBalance)} sub={<><span className="tone-positive">{formatEURSigned(invest.totalGrowth)}</span> rendement</>} />
      </div>
      <div className="card kpi">
        <Stat label="Spaarsaldo" swatch={colors.savings} value={formatEUR(savings.finalBalance)} sub={<><span className="tone-positive">{formatEURSigned(savings.totalGrowth)}</span> rente</>} />
      </div>
      <div className="card kpi kpi-highlight">
        <Stat label="Totaal vermogen" swatch={colors.total} value={formatEUR(totals.final)} emphasis sub={`${formatPct(share)} belegd · ${formatPct(1 - share)} gespaard`} />
      </div>
      <div className="card kpi">
        <Stat label="Koopkrachtgecorrigeerd" value={formatEUR(totals.real)} sub={<>in euro’s van vandaag · <span className="tone-negative">{formatEURSigned(-totals.inflationLoss)}</span> inflatie</>} />
      </div>
    </div>
  );
}
