import { useLocation } from 'react-router-dom';
import { NAV } from '../nav.js';
import { Icon } from '../components/Icon.js';

export function Placeholder(): JSX.Element {
  const { pathname } = useLocation();
  const item = NAV.flatMap((g) => g.items).find((i) => i.path === pathname);

  return (
    <div className="page">
      <div className="page-head">
        {item && <Icon name={item.icon} size={22} />}
        <h1>{item?.label ?? 'Section'}</h1>
      </div>
      <div className="card">
        <p>
          This area is part of the CMS information architecture and becomes functional in{' '}
          <strong>Phase {item?.phase ?? '—'}</strong>.
        </p>
        <p className="muted">
          The navigation and routing are wired now so each screen has a home; the underlying
          backend endpoints and editors are delivered in their respective phase.
        </p>
      </div>
    </div>
  );
}
