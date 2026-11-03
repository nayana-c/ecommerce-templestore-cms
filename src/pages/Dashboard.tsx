import { useEffect, useState } from 'react';
import type { PublicStoreConfig } from '@ecommerce/domain';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../auth.js';
import { Icon } from '../components/Icon.js';

export function Dashboard(): JSX.Element {
  const { user } = useAuth();
  const [config, setConfig] = useState<PublicStoreConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getStoreConfig()
      .then(setConfig)
      .catch((e: unknown) =>
        setError(e instanceof ApiError ? `${e.code}: ${e.message}` : 'Could not reach the API.'),
      );
  }, []);

  const enabledFeatures = config
    ? Object.entries(config.features)
        .filter(([, on]) => on)
        .map(([name]) => name)
    : [];

  return (
    <div className="page">
      <div className="page-head">
        <Icon name="dashboard" size={22} />
        <h1>Dashboard</h1>
      </div>

      <div className="card welcome">
        <p>
          Welcome back, <strong>{user?.name}</strong>. You are signed in as{' '}
          <span className="chip">{user?.roles.join(', ')}</span>.
        </p>
      </div>

      <div className="grid">
        <section className="card">
          <h2>Store</h2>
          {error && <p className="error">{error}</p>}
          {!error && !config && <p className="muted">Loading…</p>}
          {config && (
            <dl className="config">
              <dt>Name</dt>
              <dd>{config.store.name}</dd>
              <dt>Currency</dt>
              <dd>{config.store.currency}</dd>
              <dt>Locale</dt>
              <dd>{config.store.locale}</dd>
              <dt>Theme</dt>
              <dd>
                {config.theme.themeId} (v{config.theme.publishedVersion})
              </dd>
            </dl>
          )}
        </section>

        <section className="card">
          <h2>Enabled features</h2>
          {config ? (
            <ul className="chips">
              {enabledFeatures.map((f) => (
                <li className="chip" key={f}>
                  {f}
                </li>
              ))}
              {enabledFeatures.length === 0 && <span className="muted">none</span>}
            </ul>
          ) : (
            <p className="muted">—</p>
          )}
        </section>
      </div>
    </div>
  );
}
