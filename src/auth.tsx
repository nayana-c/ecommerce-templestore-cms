/**
 * Auth context backed by ecommerce-api.
 *
 * On mount it restores an existing session (if a refresh token is present) by
 * calling /auth/me, which transparently refreshes an expired access token.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, hasSession, type AuthUser } from './api/client.js';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthState {
  status: Status;
  user: AuthUser | null;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!hasSession()) {
        if (active) setStatus('anonymous');
        return;
      }
      try {
        const me = await api.me();
        if (active) {
          setUser(me);
          setStatus('authenticated');
        }
      } catch {
        if (active) setStatus('anonymous');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      status,
      user,
      async signIn(email, password) {
        const me = await api.login(email, password);
        setUser(me);
        setStatus('authenticated');
      },
      async signOut() {
        await api.logout();
        setUser(null);
        setStatus('anonymous');
      },
    }),
    [status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
