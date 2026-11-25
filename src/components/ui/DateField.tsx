import { useId } from 'react';

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  compact?: boolean;
}

export function DateField({ label, value, onChange, min, max, compact }: DateFieldProps) {
  const id = useId();
  return (
    <div className={`field${compact ? ' field-compact' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap">
        <input
          id={id}
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={(e) => e.target.value && onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
