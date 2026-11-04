import type { SelectHTMLAttributes } from 'react';
import { Field } from './Field.js';

export interface SelectOption {
  value: string;
  label: string;
}

export type SelectProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  /** Optional leading option (e.g. "— none —") rendered before the list. */
  placeholder?: string;
  hint?: string;
  error?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'>;

/** Labelled dropdown driven by an `options` array. */
export function Select({
  label,
  value,
  onValueChange,
  options,
  placeholder,
  hint,
  error,
  required,
  ...rest
}: SelectProps): JSX.Element {
  return (
    <Field label={label} required={required} hint={hint} error={error}>
      <select
        {...rest}
        value={value}
        required={required}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onValueChange(e.target.value)}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
