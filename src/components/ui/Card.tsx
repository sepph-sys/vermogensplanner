import type { ReactNode } from 'react';

interface CardProps {
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ title, subtitle, icon, actions, children, className = '' }: CardProps) {
  return (
    <section className={`card ${className}`}>
      <header className="card-head">
        <div className="card-title">
          {icon && <span className="card-icon" aria-hidden="true">{icon}</span>}
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="card-sub">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="card-actions">{actions}</div>}
      </header>
      {children}
    </section>
  );
}
