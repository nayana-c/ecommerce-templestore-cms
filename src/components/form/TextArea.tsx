import type { TextareaHTMLAttributes } from 'react';
import { Field } from './Field.js';

export type TextAreaProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  hint?: string;
  error?: string;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'>;

/** Labelled multi-line text input. */
export function TextArea({
  label,
  value,
  onValueChange,
  hint,
  error,
  required,
  rows = 3,
  ...rest
}: TextAreaProps): JSX.Element {
  return (
    <Field label={label} required={required} hint={hint} error={error}>
      <textarea
        {...rest}
        rows={rows}
        value={value}
        required={required}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onValueChange(e.target.value)}
      />
    </Field>
  );
}
