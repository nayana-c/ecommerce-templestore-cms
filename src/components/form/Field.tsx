import type { ReactNode } from 'react';

export interface FieldProps {
  /** Visible field label. */
  label: ReactNode;
  /** Mark the field as required (adds a subtle asterisk). */
  required?: boolean;
  /** Helper text shown under the control when there is no error. */
  hint?: ReactNode;
  /** Error text shown under the control (takes precedence over the hint). */
  error?: ReactNode;
  /** The control this field wraps. */
  children: ReactNode;
}

/**
 * Label + hint/error shell shared by every form control.
 *
 * Wrapping the control in the `<label>` gives it an implicit accessible name,
 * so individual controls don't need their own `id`/`htmlFor` wiring.
 */
export function Field({ label, required, hint, error, children }: FieldProps): JSX.Element {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {required && <span className="field-req" aria-hidden="true">*</span>}
      </span>
      {children}
      {error ? (
        <span className="field-error">{error}</span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </label>
  );
}
