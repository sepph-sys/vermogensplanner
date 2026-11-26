import { useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface TabDef<T extends string> {
  id: T;
  label: string;
  icon?: ReactNode;
}

interface TabsProps<T extends string> {
  tabs: TabDef<T>[];
  value: T;
  onChange: (id: T) => void;
}

/** Toegankelijke tabbalk (WAI-ARIA tabs): pijltjes links/rechts, Home/End. */
export function Tabs<T extends string>({ tabs, value, onChange }: TabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent, i: number) => {
    const last = tabs.length - 1;
    const next =
      e.key === 'ArrowRight' ? (i === last ? 0 : i + 1)
      : e.key === 'ArrowLeft' ? (i === 0 ? last : i - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div className="tabs" role="tablist" aria-label="Onderdelen">
      {tabs.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => (refs.current[i] = el)}
          id={`tab-${t.id}`}
          type="button"
          role="tab"
          aria-selected={t.id === value}
          aria-controls={`panel-${t.id}`}
          tabIndex={t.id === value ? 0 : -1}
          className={`tab${t.id === value ? ' active' : ''}`}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          {t.icon}
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}
