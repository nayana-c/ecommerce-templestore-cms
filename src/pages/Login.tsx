import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { ApiError } from '../api/client.js';
import { useAuth } from '../auth.js';

export function Login(): JSX.Element {
  const { status, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === 'authenticated') return <Navigate to="/" replace />;

  async function onSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <form className="card auth-card" onSubmit={(e) => void onSubmit(e)}>
        <h1>
          <span className="brand-mark" aria-hidden="true">
            ॐ
          </span>
          Temple Store
        </h1>
        <p className="muted">Sign in to manage your store.</p>

        {error && <div className="error banner">{error}</div>}

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@temple-store.local"
            autoComplete="username"
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
