import { useAuth } from '../auth.js';
import { Icon } from '../components/Icon.js';

export function UsersPage(): JSX.Element {
  const { user } = useAuth();
  return (
    <div className="page">
      <div className="page-head">
        <Icon name="shield" size={22} />
        <h1>Users &amp; Roles</h1>
      </div>

      <section className="card">
        <h2>Your account</h2>
        <dl className="config">
          <dt>Name</dt>
          <dd>{user?.name}</dd>
          <dt>Email</dt>
          <dd>{user?.email}</dd>
          <dt>Roles</dt>
          <dd>{user?.roles.join(', ')}</dd>
          <dt>Status</dt>
          <dd>{user?.status}</dd>
        </dl>
      </section>

      <section className="card muted">
        <p>
          Authentication, sessions and reuse-detected rotating refresh tokens are live now.
          Inviting users, assigning roles and fine-grained RBAC land with the admin tooling.
        </p>
      </section>
    </div>
  );
}
