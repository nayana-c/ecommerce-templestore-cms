import type { InputHTMLAttributes } from 'react';
import { Field } from './Field.js';

export type TextFieldProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  hint?: string;
  error?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>;

/**
 * Labelled single-line text input. Any native `<input>` attribute
 * (`type`, `placeholder`, `step`, `min`, `autoFocus`, …) passes straight
 * through, so one component covers text, number, search, email, etc.
 */
export function TextField({
  label,
  value,
  onValueChange,
  hint,
  error,
  required,
  ...rest
}: TextFieldProps): JSX.Element {
  return (
    <Field label={label} required={required} hint={hint} error={error}>
      <input
        {...rest}
        value={value}
        required={required}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onValueChange(e.target.value)}
      />
    </Field>
  );
}
