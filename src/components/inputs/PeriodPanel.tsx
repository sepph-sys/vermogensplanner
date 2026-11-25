import type { PeriodState } from '../../lib/model';
import { addMonths } from '../../lib/dates';
import { horizonMonths } from '../../lib/finance';
import { formatDuration } from '../../lib/format';
import { Card } from '../ui/Card';
import { DateField } from '../ui/DateField';
import { IconCalendar } from '../ui/icons';

interface Props {
  period: PeriodState;
  onChange: (p: PeriodState) => void;
}

const PRESETS = [10, 20, 30, 40];

/** Looptijd – geldt voor zowel beleggen als sparen. */
export function PeriodPanel({ period, onChange }: Props) {
  const months = horizonMonths(period.startDate, period.endDate);
  return (
    <Card title="Looptijd" subtitle={`${formatDuration(months)} · geldt voor beide modules`} icon={<IconCalendar />}>
      <div className="grid-2">
        <DateField label="Startdatum" value={period.startDate} onChange={(startDate) => onChange({ ...period, startDate })} />
        <DateField
          label="Einddatum"
          value={period.endDate}
          min={period.startDate}
          onChange={(endDate) => onChange({ ...period, endDate })}
        />
      </div>
      <div className="chips" role="group" aria-label="Snelkeuze looptijd">
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
      {months === 0 && <p className="notice">De einddatum moet minstens één maand na de startdatum liggen.</p>}
    </Card>
  );
}
