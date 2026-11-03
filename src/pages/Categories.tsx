import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ApiError, api, type AdminCategory, type CategoryInput } from '../api/client.js';
import { Icon } from '../components/Icon.js';
import { slugify } from '../format.js';

interface FormState {
  id: string | null;
  name: string;
  slug: string;
  slugEdited: boolean;
  description: string;
  parentId: string;
  status: 'active' | 'hidden';
  sortOrder: number;
}

const emptyForm: FormState = {
  id: null,
  name: '',
  slug: '',
  slugEdited: false,
  description: '',
  parentId: '',
  status: 'active',
  sortOrder: 0,
};

export function Categories(): JSX.Element {
  const [list, setList] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const byId = useMemo(() => new Map(list.map((c) => [c.id, c])), [list]);

  async function load(): Promise<void> {
    setLoading(true);
    try {
      setList(await api.categories.list());
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load categories.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => void load(), []);

  function startCreate(): void {
    setForm(emptyForm);
    setFormError(null);
  }
  function startEdit(cat: AdminCategory): void {
    setForm({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      slugEdited: true,
      description: cat.description ?? '',
      parentId: cat.parentId ?? '',
      status: cat.status,
      sortOrder: cat.sortOrder,
    });
    setFormError(null);
  }

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    const input: CategoryInput = {
      name: form.name,
      slug: form.slug,
      description: form.description || undefined,
      parentId: form.parentId || null,
      status: form.status,
      sortOrder: form.sortOrder,
    };
    try {
      if (form.id) await api.categories.update(form.id, input);
      else await api.categories.create(input);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(cat: AdminCategory): Promise<void> {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    try {
      await api.categories.remove(cat.id);
      if (form.id === cat.id) setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed.');
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <Icon name="tag" size={22} />
        <h1>Categories</h1>
      </div>

      <form className="card form-grid" onSubmit={(e) => void onSubmit(e)}>
        <h2>{form.id ? 'Edit category' : 'New category'}</h2>
        {formError && <div className="error banner">{formError}</div>}
        <div className="row2">
          <label>
            Name
            <input
              value={form.name}
              required
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  name: e.target.value,
                  slug: f.slugEdited ? f.slug : slugify(e.target.value),
                }))
              }
            />
          </label>
          <label>
            Slug
            <input
              value={form.slug}
              required
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value, slugEdited: true }))}
            />
          </label>
        </div>
        <label>
          Description
          <input
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </label>
        <div className="row3">
          <label>
            Parent
            <select
              value={form.parentId}
              onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
            >
              <option value="">— none —</option>
              {list
                .filter((c) => c.id !== form.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as 'active' | 'hidden' }))
              }
            >
              <option value="active">active</option>
              <option value="hidden">hidden</option>
            </select>
          </label>
          <label>
            Sort order
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
            />
          </label>
        </div>
        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : form.id ? 'Save changes' : 'Create category'}
          </button>
          {form.id && (
            <button type="button" className="secondary" onClick={startCreate}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <section className="card">
        <h2>All categories</h2>
        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="muted">Loading…</p>
        ) : list.length === 0 ? (
          <p className="muted">No categories yet. Create one above.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Parent</th>
                <th>Status</th>
                <th>Order</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td className="muted">{c.slug}</td>
                  <td className="muted">{c.parentId ? byId.get(c.parentId)?.name ?? '—' : '—'}</td>
                  <td>
                    <span className={`pill ${c.status}`}>{c.status}</span>
                  </td>
                  <td>{c.sortOrder}</td>
                  <td className="row-actions">
                    <button className="link" onClick={() => startEdit(c)}>
                      Edit
                    </button>
                    <button className="link danger" onClick={() => void onDelete(c)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
