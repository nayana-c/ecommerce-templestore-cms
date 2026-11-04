import type { SelectOption } from './Select.js';

export interface CheckboxGroupProps {
  legend: string;
  options: SelectOption[];
  /** Currently selected option values. */
  value: string[];
  onToggle: (value: string) => void;
  /** Shown when there are no options to choose from. */
  emptyText?: string;
}

/** Labelled set of checkboxes backed by an array of selected values. */
export function CheckboxGroup({
  legend,
  options,
  value,
  onToggle,
  emptyText = 'Nothing to choose yet.',
}: CheckboxGroupProps): JSX.Element {
  return (
    <fieldset className="catset">
      <legend>{legend}</legend>
      {options.length === 0 ? (
        <span className="muted">{emptyText}</span>
      ) : (
        <div className="checks">
          {options.map((o) => (
            <label key={o.value} className="check">
              <input
                type="checkbox"
                checked={value.includes(o.value)}
                onChange={() => onToggle(o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}
