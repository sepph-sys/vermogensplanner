import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { formatNumber, parseUserNumber } from '../../lib/format';

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
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
}: NumberFieldProps) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(() => formatNumber(value, decimals, !noGrouping));

  // Externe wijzigingen (bv. door de budgetslider) doorvoeren als het veld niet actief is.
  useEffect(() => {
    if (!focused) setText(formatNumber(value, decimals, !noGrouping));
  }, [value, decimals, focused, noGrouping]);

  const clamp = (n: number) => Math.min(Math.max(n, min), max);

  const commit = (raw: string) => {
    setText(raw);
    const n = parseUserNumber(raw);
    if (n !== null) onChange(clamp(n));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const delta = (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1);
    const next = clamp(Math.round((value + delta) * 1e6) / 1e6);
    onChange(next);
    setText(formatNumber(next, decimals, !noGrouping));
  };

  return (
    <div className={`field${compact ? ' field-compact' : ''}`}>
      <label htmlFor={id}>{label}</label>
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
            setText(formatNumber(value, decimals, !noGrouping));
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
