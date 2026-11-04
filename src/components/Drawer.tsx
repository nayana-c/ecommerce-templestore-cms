import { useEffect, type ReactNode } from 'react';

export interface DrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  /** When true, scrim/Escape/✕ won't close the drawer (e.g. mid-save). */
  closeDisabled?: boolean;
  children: ReactNode;
}

/**
 * Slide-in right-hand drawer used to host create/edit forms across modules.
 * Closes on scrim click and Escape unless `closeDisabled` is set.
 */
export function Drawer({ open, title, onClose, closeDisabled, children }: DrawerProps): JSX.Element {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !closeDisabled) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeDisabled, onClose]);

  const requestClose = (): void => {
    if (!closeDisabled) onClose();
  };

  return (
    <div className={`drawer-root${open ? ' open' : ''}`} aria-hidden={!open}>
      <div className="drawer-scrim" onClick={requestClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="drawer-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={requestClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}
