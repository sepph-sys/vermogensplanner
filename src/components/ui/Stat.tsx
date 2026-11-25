import type { ReactNode } from 'react';

interface StatProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'default' | 'positive' | 'negative';
  swatch?: string;
  emphasis?: boolean;
}

/** Eén kerncijfer met label en optionele toelichting. */
export function Stat({ label, value, sub, tone = 'default', swatch, emphasis }: StatProps) {
  return (
    <div className={`stat${emphasis ? ' stat-emphasis' : ''}`}>
      <span className="stat-label">
        {swatch && <span className="swatch" style={{ background: swatch }} aria-hidden="true" />}
        {label}
      </span>
      <span className={`stat-value tone-${tone}`}>{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}
