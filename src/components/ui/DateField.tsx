import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { formatDMY, parseUserDate } from '../../lib/dates';
import { IconCalendar } from './icons';

interface DateFieldProps {
  label: string;
  /** ISO-datum (YYYY-MM-DD). */
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  compact?: boolean;
  hideLabel?: boolean;
}

/**
 * Datumveld dat zowel typen als de kalender ondersteunt.
 *
 * - Weergave altijd dd/mm/jjjj.
 * - Getypte invoer wordt bij Enter of het verlaten van het veld herkend:
 *   dd/mm/jjjj, mm/dd/jjjj (als dd/mm onmogelijk is), jjjj/mm/dd, en zonder
 *   scheidingstekens ddmmjjjj. Zie `parseUserDate`.
 * - Niet te herkennen of buiten min/max: rode markering + melding; de
 *   vorige geldige waarde blijft in de berekening staan.
 * - De kalenderknop opent de native datumkiezer van de browser.
 */
export function DateField({ label, value, onChange, min, max, compact, hideLabel }: DateFieldProps) {
  const id = useId();
  const pickerRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => formatDMY(value));
  const focused = useRef(false);
  const [error, setError] = useState<string | null>(null);

  // Externe wijziging (snelkeuze, kalender, reset) → weergave bijwerken.
  // Alleen op een nieuwe waarde, zodat een foutmelding na het verlaten van
  // het veld zichtbaar blijft.
  useEffect(() => {
    if (!focused.current) {
      setText(formatDMY(value));
      setError(null);
    }
  }, [value]);

  const commit = (raw: string) => {
    if (!raw.trim()) {
      setError('Vul een datum in (dd/mm/jjjj).');
      return;
    }
    const iso = parseUserDate(raw);
    if (!iso) {
      setError('Geen geldige datum. Gebruik dd/mm/jjjj.');
      return;
    }
    if (min && iso < min) {
      setError(`Datum moet op of na ${formatDMY(min)} liggen.`);
      return;
    }
    if (max && iso > max) {
      setError(`Datum moet op of vóór ${formatDMY(max)} liggen.`);
      return;
    }
    setError(null);
    setText(formatDMY(iso));
    if (iso !== value) onChange(iso);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit(text);
    } else if (e.key === 'Escape') {
      setText(formatDMY(value));
      setError(null);
    }
  };

  const openPicker = () => {
    const el = pickerRef.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
      el.click();
    }
  };

  return (
    <div className={`field${compact ? ' field-compact' : ''}`}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : undefined}>{label}</label>
      <div className={`input-wrap date-wrap${error ? ' invalid' : ''}`}>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="dd/mm/jjjj"
          value={text}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          onFocus={() => (focused.current = true)}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError(null);
          }}
          onBlur={() => {
            focused.current = false;
            commit(text);
          }}
          onKeyDown={onKeyDown}
        />
        <button type="button" className="date-btn" aria-label={`Kalender openen: ${label}`} tabIndex={-1} onClick={openPicker}>
          <IconCalendar />
        </button>
        {/* Verborgen native datumkiezer voor de kalender */}
        <input
          ref={pickerRef}
          className="date-picker-native"
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            if (!e.target.value) return;
            setError(null);
            setText(formatDMY(e.target.value));
            onChange(e.target.value);
          }}
        />
      </div>
      {error && (
        <span className="field-error" id={`${id}-err`} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
