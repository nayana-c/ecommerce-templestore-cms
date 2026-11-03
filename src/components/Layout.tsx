import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../auth.js';
import { NAV } from '../nav.js';
import { Icon } from './Icon.js';

/** First letters of the first two name words, for the topbar avatar. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

export function Layout(): JSX.Element {
  const { user, signOut } = useAuth();
  const [features, setFeatures] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api
      .getStoreConfig()
      .then((c) => setFeatures(c.features))
      .catch(() => setFeatures({}));
  }, []);

  // Hide feature-gated items whose feature is not enabled for this client.
  const groups = NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.feature || features[i.feature]),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ॐ
          </span>
          <span className="brand-text">
            <span className="brand-name">Temple Store</span>
            <span className="brand-sub">Commerce</span>
          </span>
        </div>
        <nav>
          {groups.map((group) => (
            <div className="nav-group" key={group.title}>
              <div className="nav-group-title">{group.title}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  <Icon name={item.icon} />
                  <span className="nav-label">{item.label}</span>
                  {item.phase > 2 && !item.ready && <span className="nav-badge">P{item.phase}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="spacer" />
          {user && (
            <>
              <div className="user">
                <div className="user-name">{user.name}</div>
                <div className="user-sub">{user.roles.join(', ')}</div>
              </div>
              <div className="avatar" aria-hidden="true">
                {initials(user.name)}
              </div>
            </>
          )}
          <button className="icon-btn" onClick={() => void signOut()} title="Sign out" aria-label="Sign out">
            <Icon name="logout" />
          </button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
