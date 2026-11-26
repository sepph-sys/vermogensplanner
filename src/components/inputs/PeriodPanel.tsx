import type { PeriodState } from '../../lib/model';
import { addMonths } from '../../lib/dates';
import { horizonMonths } from '../../lib/finance';
import { formatDuration } from '../../lib/format';
import { DateField } from '../ui/DateField';
import { IconCalendar } from '../ui/icons';

interface Props {
  period: PeriodState;
  onChange: (p: PeriodState) => void;
}

const PRESETS = [10, 20, 30, 40];

/** Looptijd als filterbalk bovenaan het dashboard – geldt voor alle berekeningen. */
export function PeriodPanel({ period, onChange }: Props) {
  const months = horizonMonths(period.startDate, period.endDate);
  return (
    <section className="card filter-bar" aria-label="Analyseperiode">
      <div className="filter-bar-title">
        <span className="card-icon" aria-hidden="true"><IconCalendar /></span>
        <div>
          <h2>Analyseperiode</h2>
          <p className="card-sub">{formatDuration(months)} · geldt voor alle berekeningen</p>
        </div>
      </div>
      <div className="filter-bar-fields">
        <DateField compact label="Startdatum" value={period.startDate} onChange={(startDate) => onChange({ ...period, startDate })} />
        <DateField compact label="Einddatum" value={period.endDate} min={period.startDate} onChange={(endDate) => onChange({ ...period, endDate })} />
      </div>
      <div className="chips filter-bar-chips" role="group" aria-label="Snelkeuze looptijd">
        {PRESETS.map((y) => (
          <button
            key={y}
            type="button"
            className={`chip${months === y * 12 ? ' active' : ''}`}
            onClick={() => onChange({ ...period, endDate: addMonths(period.startDate, y * 12) })}
          >
            {y} jaar
          </button>
        ))}
      </div>
      {months === 0 && <p className="notice filter-bar-notice">De einddatum moet minstens één maand na de startdatum liggen.</p>}
    </section>
  );
}
