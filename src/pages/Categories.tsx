import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ApiError, api, type AdminCategory, type CategoryInput } from '../api/client.js';
import { Icon } from '../components/Icon.js';
import { Drawer } from '../components/Drawer.js';
import { Select, TextArea, TextField } from '../components/form/index.js';
import { slugify } from '../format.js';

interface FormState {
  id: string | null;
  name: string;
  slug: string;
  slugEdited: boolean;
  description: string;
  parentId: string;
  status: 'active' | 'hidden';
  sortOrder: string;
}

const emptyForm: FormState = {
  id: null,
  name: '',
  slug: '',
  slugEdited: false,
  description: '',
  parentId: '',
  status: 'active',
  sortOrder: '0',
};

export function Categories(): JSX.Element {
  const [list, setList] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drawer-hosted create/edit form (mirrors the Products page).
  const [drawerOpen, setDrawerOpen] = useState(false);
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

  function openCreate(): void {
    setForm(emptyForm);
    setFormError(null);
    setDrawerOpen(true);
  }
  function openEdit(cat: AdminCategory): void {
    setForm({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      slugEdited: true,
      description: cat.description ?? '',
      parentId: cat.parentId ?? '',
      status: cat.status,
      sortOrder: String(cat.sortOrder),
    });
    setFormError(null);
    setDrawerOpen(true);
  }
  function closeDrawer(): void {
    setDrawerOpen(false);
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
      sortOrder: Number(form.sortOrder) || 0,
    };
    try {
      if (form.id) await api.categories.update(form.id, input);
      else await api.categories.create(input);
      setForm(emptyForm);
      setDrawerOpen(false);
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
      if (form.id === cat.id) {
        setForm(emptyForm);
        setDrawerOpen(false);
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed.');
    }
  }

  // Parent options exclude the category being edited (no self-parenting).
  const parentOptions = list
    .filter((c) => c.id !== form.id)
    .map((c) => ({ value: c.id, label: c.name }));

  return (
    <div className="page">
      <div className="page-head">
        <Icon name="tag" size={22} />
        <h1>Categories</h1>
        <div className="spacer" />
        <button type="button" onClick={openCreate}>
          <span className="btn-plus">＋</span> New category
        </button>
      </div>

      <section className="card">
        <h2>All categories</h2>
        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="muted">Loading…</p>
        ) : list.length === 0 ? (
          <p className="muted">No categories yet. Create one with “＋ New category”.</p>
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
                    <button className="link" onClick={() => openEdit(c)}>
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

      {/* Slide-in create/edit drawer */}
      <Drawer
        open={drawerOpen}
        title={form.id ? 'Edit category' : 'New category'}
        onClose={closeDrawer}
        closeDisabled={saving}
      >
        <form className="form-grid drawer-body" onSubmit={(e) => void onSubmit(e)}>
          {formError && <div className="error banner">{formError}</div>}
          <TextField
            label="Name"
            required
            value={form.name}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                name: v,
                slug: f.slugEdited ? f.slug : slugify(v),
              }))
            }
          />
          <TextField
            label="Slug"
            required
            value={form.slug}
            onValueChange={(v) => setForm((f) => ({ ...f, slug: v, slugEdited: true }))}
          />
          <TextArea
            label="Description"
            rows={2}
            value={form.description}
            onValueChange={(v) => setForm((f) => ({ ...f, description: v }))}
          />
          <div className="row2">
            <Select
              label="Parent"
              value={form.parentId}
              placeholder="— none —"
              options={parentOptions}
              onValueChange={(v) => setForm((f) => ({ ...f, parentId: v }))}
            />
            <Select
              label="Status"
              value={form.status}
              onValueChange={(v) => setForm((f) => ({ ...f, status: v as 'active' | 'hidden' }))}
              options={[
                { value: 'active', label: 'active' },
                { value: 'hidden', label: 'hidden' },
              ]}
            />
          </div>
          <TextField
            label="Sort order"
            type="number"
            value={form.sortOrder}
            onValueChange={(v) => setForm((f) => ({ ...f, sortOrder: v }))}
          />
          <div className="drawer-actions">
            <button type="button" className="secondary" onClick={closeDrawer} disabled={saving}>
              Cancel
            </button>
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : form.id ? 'Save changes' : 'Create category'}
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
