import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ApiError,
  api,
  type AdminCategory,
  type AdminProduct,
  type ProductInput,
} from '../api/client.js';
import { Icon } from '../components/Icon.js';
import { Drawer } from '../components/Drawer.js';
import { CheckboxGroup, Select, TextArea, TextField } from '../components/form/index.js';
import { formatMoney, slugify, toMajor, toMinor } from '../format.js';

interface FormState {
  id: string | null;
  name: string;
  slug: string;
  slugEdited: boolean;
  description: string;
  productType: 'physical' | 'service';
  status: 'draft' | 'active' | 'archived';
  price: string;
  compareAtPrice: string;
  sku: string;
  stockQuantity: string;
  categoryIds: string[];
  images: string;
}

const emptyForm: FormState = {
  id: null,
  name: '',
  slug: '',
  slugEdited: false,
  description: '',
  productType: 'physical',
  status: 'draft',
  price: '',
  compareAtPrice: '',
  sku: '',
  stockQuantity: '',
  categoryIds: [],
  images: '',
};

const PAGE_SIZE = 10;
type StatusFilter = 'all' | FormState['status'];

export function Products(): JSX.Element {
  const [list, setList] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drawer-hosted create/edit form.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const catName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  // Listing controls: search, status + category filters, cursor pagination.
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  // A stack of the cursors used to reach each visited page; [undefined] = page 1.
  const [pageCursors, setPageCursors] = useState<(string | undefined)[]>([undefined]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const pageIndex = pageCursors.length - 1;

  // Debounce the search box so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to the first page whenever a filter or the search term changes.
  useEffect(() => {
    setPageCursors([undefined]);
  }, [debouncedSearch, statusFilter, categoryFilter]);

  async function loadCategories(): Promise<void> {
    try {
      setCategories(await api.categories.list());
    } catch {
      /* categories are non-critical for the listing; ignore load failures */
    }
  }

  // Keep the latest request wins, so a slow response can't clobber a newer one.
  const reqId = useRef(0);
  async function loadProducts(): Promise<void> {
    const mine = ++reqId.current;
    setLoading(true);
    try {
      const page = await api.products.list({
        q: debouncedSearch || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
        cursor: pageCursors[pageIndex],
        limit: PAGE_SIZE,
      });
      if (mine !== reqId.current) return;
      setList(page.items);
      setNextCursor(page.nextCursor);
      setError(null);
    } catch (e) {
      if (mine !== reqId.current) return;
      setError(e instanceof ApiError ? e.message : 'Failed to load products.');
    } finally {
      if (mine === reqId.current) setLoading(false);
    }
  }

  useEffect(() => void loadCategories(), []);
  useEffect(() => {
    void loadProducts();
  }, [debouncedSearch, statusFilter, categoryFilter, pageCursors]);

  function openCreate(): void {
    setForm(emptyForm);
    setFormError(null);
    setDrawerOpen(true);
  }
  function openEdit(p: AdminProduct): void {
    setForm({
      id: p.id,
      name: p.name,
      slug: p.slug,
      slugEdited: true,
      description: p.description ?? '',
      productType: p.productType,
      status: p.status,
      price: String(toMajor(p.price.amountMinor)),
      compareAtPrice: p.compareAtPrice ? String(toMajor(p.compareAtPrice.amountMinor)) : '',
      sku: p.sku ?? '',
      stockQuantity: p.stockQuantity === null ? '' : String(p.stockQuantity),
      categoryIds: p.categoryIds,
      images: p.images.join('\n'),
    });
    setFormError(null);
    setDrawerOpen(true);
  }
  function closeDrawer(): void {
    setDrawerOpen(false);
  }

  function toggleCategory(id: string): void {
    setForm((f) => ({
      ...f,
      categoryIds: f.categoryIds.includes(id)
        ? f.categoryIds.filter((c) => c !== id)
        : [...f.categoryIds, id],
    }));
  }

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    const input: ProductInput = {
      name: form.name,
      slug: form.slug,
      description: form.description || undefined,
      productType: form.productType,
      status: form.status,
      categoryIds: form.categoryIds,
      priceMinor: toMinor(form.price),
      compareAtPrice: undefined,
      compareAtPriceMinor: form.compareAtPrice ? toMinor(form.compareAtPrice) : null,
      sku: form.sku || null,
      stockQuantity: form.stockQuantity === '' ? null : Number(form.stockQuantity),
      images: form.images
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean),
    } as ProductInput;
    try {
      if (form.id) await api.products.update(form.id, input);
      else await api.products.create(input);
      setForm(emptyForm);
      setDrawerOpen(false);
      await loadProducts();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(p: AdminProduct): Promise<void> {
    if (!confirm(`Delete product "${p.name}"?`)) return;
    try {
      await api.products.remove(p.id);
      if (form.id === p.id) {
        setForm(emptyForm);
        setDrawerOpen(false);
      }
      await loadProducts();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Delete failed.');
    }
  }

  const hasFilters = debouncedSearch !== '' || statusFilter !== 'all' || categoryFilter !== 'all';
  function clearFilters(): void {
    setSearch('');
    setStatusFilter('all');
    setCategoryFilter('all');
  }

  return (
    <div className="page wide">
      <div className="page-head">
        <Icon name="box" size={22} />
        <h1>Products</h1>
        <div className="spacer" />
        <button type="button" onClick={openCreate}>
          <span className="btn-plus">＋</span> New product
        </button>
      </div>

      <section className="card">
        {/* Search + filters */}
        <div className="list-toolbar">
          <div className="search">
            <Icon name="search" size={16} />
            <input
              type="search"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {hasFilters && (
            <button type="button" className="link" onClick={clearFilters}>
              Clear
            </button>
          )}
        </div>

        <div className="filter-tabs">
          {(['all', 'active', 'draft', 'archived'] as const).map((key) => (
            <button
              key={key}
              type="button"
              className={`tab${statusFilter === key ? ' active' : ''}`}
              onClick={() => setStatusFilter(key)}
            >
              {key === 'all' ? 'All' : key[0]!.toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>

        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="muted">Loading…</p>
        ) : list.length === 0 ? (
          <p className="muted">
            {hasFilters ? 'No products match your filters.' : 'No products yet. Create one above.'}
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Status</th>
                <th>Stock</th>
                <th>Categories</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.name}
                    <div className="muted small">{p.slug}</div>
                  </td>
                  <td>{formatMoney(p.price)}</td>
                  <td>
                    <span className={`pill ${p.status}`}>{p.status}</span>
                  </td>
                  <td>{p.stockQuantity === null ? '—' : p.stockQuantity}</td>
                  <td className="muted small">
                    {p.categoryIds.map((id) => catName.get(id) ?? '?').join(', ') || '—'}
                  </td>
                  <td className="row-actions">
                    <button className="link" onClick={() => openEdit(p)}>
                      Edit
                    </button>
                    <button className="link danger" onClick={() => void onDelete(p)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Cursor pagination */}
        {(pageIndex > 0 || nextCursor) && (
          <div className="pagination">
            <span className="muted small">Page {pageIndex + 1}</span>
            <div className="pagination-btns">
              <button
                type="button"
                className="secondary"
                disabled={pageIndex === 0 || loading}
                onClick={() => setPageCursors((cs) => cs.slice(0, -1))}
              >
                ‹ Prev
              </button>
              <button
                type="button"
                className="secondary"
                disabled={!nextCursor || loading}
                onClick={() => setPageCursors((cs) => [...cs, nextCursor ?? undefined])}
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Slide-in create/edit drawer */}
      <Drawer
        open={drawerOpen}
        title={form.id ? 'Edit product' : 'New product'}
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
            value={form.description}
            onValueChange={(v) => setForm((f) => ({ ...f, description: v }))}
          />
          <div className="row2">
            <TextField
              label="Price (major units)"
              type="number"
              step="0.01"
              min="0"
              required
              value={form.price}
              onValueChange={(v) => setForm((f) => ({ ...f, price: v }))}
            />
            <TextField
              label="Compare-at (optional)"
              type="number"
              step="0.01"
              min="0"
              value={form.compareAtPrice}
              onValueChange={(v) => setForm((f) => ({ ...f, compareAtPrice: v }))}
            />
          </div>
          <div className="row2">
            <TextField
              label="Stock"
              type="number"
              min="0"
              hint="Blank = untracked"
              value={form.stockQuantity}
              onValueChange={(v) => setForm((f) => ({ ...f, stockQuantity: v }))}
            />
            <TextField
              label="SKU (optional)"
              value={form.sku}
              onValueChange={(v) => setForm((f) => ({ ...f, sku: v }))}
            />
          </div>
          <div className="row2">
            <Select
              label="Status"
              value={form.status}
              onValueChange={(v) => setForm((f) => ({ ...f, status: v as FormState['status'] }))}
              options={[
                { value: 'draft', label: 'draft' },
                { value: 'active', label: 'active' },
                { value: 'archived', label: 'archived' },
              ]}
            />
            <Select
              label="Type"
              value={form.productType}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, productType: v as FormState['productType'] }))
              }
              options={[
                { value: 'physical', label: 'physical' },
                { value: 'service', label: 'service' },
              ]}
            />
          </div>
          <CheckboxGroup
            legend="Categories"
            emptyText="No categories yet — create some first."
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            value={form.categoryIds}
            onToggle={toggleCategory}
          />
          <TextArea
            label="Image URLs"
            rows={2}
            hint="One per line"
            value={form.images}
            onValueChange={(v) => setForm((f) => ({ ...f, images: v }))}
          />
          <div className="drawer-actions">
            <button type="button" className="secondary" onClick={closeDrawer} disabled={saving}>
              Cancel
            </button>
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : form.id ? 'Save changes' : 'Create product'}
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
