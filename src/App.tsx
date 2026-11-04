import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.js';
import { Layout } from './components/Layout.js';
import { NAV } from './nav.js';
import { Categories } from './pages/Categories.js';
import { Dashboard } from './pages/Dashboard.js';
import { Login } from './pages/Login.js';
import { Orders } from './pages/Orders.js';
import { Placeholder } from './pages/Placeholder.js';
import { Products } from './pages/Products.js';
import { UsersPage } from './pages/Users.js';

// Paths that have a dedicated page; everything else routes to a placeholder.
const REAL_PATHS = new Set(['/', '/users', '/products', '/categories', '/orders']);
const PLACEHOLDER_PATHS = NAV.flatMap((g) => g.items)
  .map((i) => i.path)
  .filter((p) => !REAL_PATHS.has(p));

function RequireAuth({ children }: { children: JSX.Element }): JSX.Element {
  const { status } = useAuth();
  if (status === 'loading') {
    return <div className="center muted">Loading…</div>;
  }
  if (status === 'anonymous') {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="categories" element={<Categories />} />
        <Route path="orders" element={<Orders />} />
        <Route path="users" element={<UsersPage />} />
        {PLACEHOLDER_PATHS.map((p) => (
          <Route key={p} path={p.replace(/^\//, '')} element={<Placeholder />} />
        ))}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
