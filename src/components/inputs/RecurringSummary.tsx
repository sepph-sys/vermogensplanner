import { FREQUENCY_LABEL, isRecurring, monthlyEquivalent, type Contribution, type Target } from '../../lib/contributions';
import { formatDMY } from '../../lib/dates';
import { formatEUR, formatNumber } from '../../lib/format';
import type { ModelResult } from '../../lib/model';

interface Props {
  rows: Contribution[];
  ignored: Contribution[];
  model: ModelResult;
  colors: { invest: string; savings: string };
}

const LABEL: Record<Target, string> = { invest: 'Beleggen', savings: 'Sparen' };

/** Korte samenvatting bovenaan de inlegpagina: welke vaste inleg zit in het model. */
export function RecurringSummary({ rows, ignored, model, colors }: Props) {
  const ignoredIds = new Set(ignored.map((r) => r.id));
  const active = rows.filter((r) => isRecurring(r) && !ignoredIds.has(r.id) && r.amount > 0).sort((a, b) => a.date.localeCompare(b.date));
  const per = (t: Target) => active.filter((r) => r.target === t).reduce((s, r) => s + monthlyEquivalent(r), 0);
  const total = per('invest') + per('savings');
  const last = model.lastMonthlyInvest + model.lastMonthlySavings;
  const first = model.monthlyInvest + model.monthlySavings;

  return (
    <section className="card recurring-summary" aria-label="Vaste inleg in het model">
      <div className="rs-head">
        <div>
          <span className="stat-label">Vaste inleg in het model</span>
          <span className="rs-total">≈ {formatEUR(total)} <small>per maand</small></span>
          {active.length > 0 && Math.abs(last - first) > 1 && (
            <span className="stat-sub">gemiddeld {formatEUR(first)} p/m in het eerste jaar → {formatEUR(last)} p/m in het laatste jaar</span>
          )}
        </div>
        <div className="rs-split">
          {(['invest', 'savings'] as const).map((t) => (
            <span key={t}><span className="swatch" style={{ background: colors[t] }} /> {LABEL[t]} <strong>{formatEUR(per(t))}</strong> p/m</span>
          ))}
        </div>
      </div>
      {active.length === 0 ? (
        <p className="muted small">Er is geen periodieke inleg opgenomen; alleen startbedragen en eenmalige stortingen tellen mee.</p>
      ) : (
        <ul className="rs-list">
          {active.map((r) => (
            <li key={r.id}>
              <span className="swatch" style={{ background: colors[r.target] }} />
              <strong>{formatEUR(r.amount)}</strong>
              <span>{FREQUENCY_LABEL[r.frequency].toLowerCase()} naar {LABEL[r.target].toLowerCase()}</span>
              <span className="muted">
                vanaf {formatDMY(r.date)} t/m {r.endDate ? formatDMY(r.endDate) : 'einde looptijd'}
                {r.index === 'inflation' ? ' · geïndexeerd met inflatie' : r.index === 'custom' ? ` · +${formatNumber(r.indexRate)}% per jaar` : ''}
              </span>
              {r.label && <span className="rs-label">{r.label}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
