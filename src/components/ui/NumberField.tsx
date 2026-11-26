import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { formatNumber, parseUserNumber } from '../../lib/format';

interface NumberFieldProps {
  label: string;
  /** `null` = leeg veld (alleen zinvol samen met `onClear`). */
  value: number | null;
  onChange: (v: number) => void;
  /** Als gezet mag het veld leeg zijn; leegmaken roept dit aan. */
  onClear?: () => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  hint?: string;
  disabled?: boolean;
  compact?: boolean;
  /** Toon een leeg veld (met placeholder) zolang het veld uitgeschakeld is. */
  emptyWhenDisabled?: boolean;
  placeholder?: string;
  /** Geen duizendtalscheiding tonen (bv. voor jaartallen). */
  noGrouping?: boolean;
  /** Label alleen voor schermlezers (bv. in een tabelcel). */
  hideLabel?: boolean;
}

/**
 * Tekstveld voor getallen met Nederlandse notatie (1.000,50). Tijdens het
 * typen blijft de ruwe tekst staan; bij verlaten wordt netjes geformatteerd.
 * Pijltje omhoog/omlaag verhoogt/verlaagt met `step`.
 */
export function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  min = -Infinity,
  max = Infinity,
  step = 1,
  decimals = 2,
  hint,
  disabled,
  compact,
  emptyWhenDisabled,
  placeholder,
  noGrouping,
  hideLabel,
  onClear,
}: NumberFieldProps) {
  const id = useId();
  const fmt = (v: number | null) => (v === null ? '' : formatNumber(v, decimals, !noGrouping));
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(() => fmt(value));

  // Externe wijzigingen (bv. reset of andere velden) doorvoeren als het veld niet actief is.
  useEffect(() => {
    if (!focused) setText(fmt(value));
  }, [value, decimals, focused, noGrouping]);

  const clamp = (n: number) => Math.min(Math.max(n, min), max);

  const commit = (raw: string) => {
    setText(raw);
    if (onClear && raw.trim() === '') return onClear();
    const n = parseUserNumber(raw);
    if (n !== null) onChange(clamp(n));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const delta = (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1);
    const next = clamp(Math.round(((value ?? 0) + delta) * 1e6) / 1e6);
    onChange(next);
    setText(fmt(next));
  };

  return (
    <div className={`field${compact ? ' field-compact' : ''}`}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : undefined}>{label}</label>
      <div className={`input-wrap${disabled ? ' disabled' : ''}`}>
        {prefix && <span className="affix">{prefix}</span>}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={disabled && emptyWhenDisabled ? '' : text}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setText(fmt(value));
          }}
          onChange={(e) => commit(e.target.value)}
          onKeyDown={onKeyDown}
          aria-describedby={hint ? `${id}-hint` : undefined}
        />
        {suffix && <span className="affix">{suffix}</span>}
      </div>
      {hint && (
        <span className="field-hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
    </div>
  );
}
