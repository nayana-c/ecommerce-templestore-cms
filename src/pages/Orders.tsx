import { useEffect, useRef, useState } from 'react';
import {
  ApiError,
  api,
  type AdminOrder,
  type AdminPayment,
  type OrderStatus,
} from '../api/client.js';
import { Icon } from '../components/Icon.js';
import { Drawer } from '../components/Drawer.js';
import { formatMoney } from '../format.js';

const PAGE_SIZE = 10;
type StatusFilter = 'all' | OrderStatus;
const STATUS_TABS: StatusFilter[] = ['all', 'pending', 'paid', 'fulfilled', 'cancelled'];

/** Allowed status transitions — mirrors the API; the server still enforces it. */
const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['fulfilled', 'cancelled'],
  fulfilled: [],
  cancelled: [],
};
const STATUS_ACTION_LABEL: Record<OrderStatus, string> = {
  pending: 'Mark pending',
  paid: 'Mark paid',
  fulfilled: 'Mark fulfilled',
  cancelled: 'Cancel order',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function Orders(): JSX.Element {
  const [list, setList] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [pageCursors, setPageCursors] = useState<(string | undefined)[]>([undefined]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const pageIndex = pageCursors.length - 1;

  // Detail drawer: the opened order plus its payments and in-flight action state.
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    setPageCursors([undefined]);
  }, [statusFilter]);

  const reqId = useRef(0);
  async function loadOrders(): Promise<void> {
    const mine = ++reqId.current;
    setLoading(true);
    try {
      const page = await api.orders.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        cursor: pageCursors[pageIndex],
        limit: PAGE_SIZE,
      });
      if (mine !== reqId.current) return;
      setList(page.items);
      setNextCursor(page.nextCursor);
      setError(null);
    } catch (e) {
      if (mine !== reqId.current) return;
      setError(e instanceof ApiError ? e.message : 'Failed to load orders.');
    } finally {
      if (mine === reqId.current) setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, [statusFilter, pageCursors]);

  async function openDetail(order: AdminOrder): Promise<void> {
    setSelected(order);
    setPayments([]);
    setDetailError(null);
    await refreshDetail(order.id);
  }

  async function refreshDetail(id: string): Promise<void> {
    try {
      const [order, pays] = await Promise.all([api.orders.get(id), api.orders.payments(id)]);
      setSelected(order);
      setPayments(pays);
    } catch (e) {
      setDetailError(e instanceof ApiError ? e.message : 'Failed to load order.');
    }
  }

  function closeDetail(): void {
    setSelected(null);
  }

  /** Run a detail action, then refresh both the detail and the listing. */
  async function runAction(action: () => Promise<unknown>): Promise<void> {
    if (!selected) return;
    setDetailBusy(true);
    setDetailError(null);
    try {
      await action();
      await refreshDetail(selected.id);
      await loadOrders();
    } catch (e) {
      setDetailError(e instanceof ApiError ? e.message : 'Action failed.');
    } finally {
      setDetailBusy(false);
    }
  }

  const openPayment = payments.find((p) => p.status === 'requires_payment');
  const hasSucceeded = payments.some((p) => p.status === 'succeeded');

  return (
    <div className="page wide">
      <div className="page-head">
        <Icon name="cart" size={22} />
        <h1>Orders</h1>
      </div>

      <section className="card">
        <div className="filter-tabs">
          {STATUS_TABS.map((key) => (
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
            {statusFilter === 'all' ? 'No orders yet.' : `No ${statusFilter} orders.`}
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Placed</th>
                <th>Total</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id}>
                  <td>
                    {o.orderNumber}
                    <div className="muted small">
                      {o.items.length} item{o.items.length === 1 ? '' : 's'}
                    </div>
                  </td>
                  <td>
                    {o.customer.name}
                    <div className="muted small">{o.customer.email}</div>
                  </td>
                  <td className="muted small">{formatDate(o.createdAt)}</td>
                  <td>{formatMoney(o.total)}</td>
                  <td>
                    <span className={`pill ${o.status}`}>{o.status}</span>
                  </td>
                  <td className="row-actions">
                    <button className="link" onClick={() => void openDetail(o)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

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

      <Drawer
        open={selected !== null}
        title={selected ? selected.orderNumber : 'Order'}
        onClose={closeDetail}
        closeDisabled={detailBusy}
      >
        {selected && (
          <div className="drawer-body order-detail">
            {detailError && <div className="error banner">{detailError}</div>}

            <div className="detail-row">
              <span className={`pill ${selected.status}`}>{selected.status}</span>
              <span className="muted small">Placed {formatDate(selected.createdAt)}</span>
            </div>

            {/* Status lifecycle actions */}
            {NEXT_STATUSES[selected.status].length > 0 && (
              <div className="action-row">
                {NEXT_STATUSES[selected.status].map((next) => (
                  <button
                    key={next}
                    type="button"
                    className={next === 'cancelled' ? 'secondary danger' : 'secondary'}
                    disabled={detailBusy}
                    onClick={() => void runAction(() => api.orders.setStatus(selected.id, next))}
                  >
                    {STATUS_ACTION_LABEL[next]}
                  </button>
                ))}
              </div>
            )}

            <h3 className="detail-h">Items</h3>
            <table className="table compact">
              <tbody>
                {selected.items.map((it) => (
                  <tr key={it.productId}>
                    <td>
                      {it.name}
                      <div className="muted small">
                        {it.quantity} × {formatMoney(it.unitPrice)}
                      </div>
                    </td>
                    <td className="num">{formatMoney(it.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="muted">Total</td>
                  <td className="num strong">{formatMoney(selected.total)}</td>
                </tr>
              </tfoot>
            </table>

            <h3 className="detail-h">Customer</h3>
            <div className="detail-block">
              <div>{selected.customer.name}</div>
              <div className="muted small">{selected.customer.email}</div>
              {selected.customer.phone && (
                <div className="muted small">{selected.customer.phone}</div>
              )}
            </div>

            <h3 className="detail-h">Ship to</h3>
            <div className="detail-block muted small">
              <div>{selected.shippingAddress.line1}</div>
              {selected.shippingAddress.line2 && <div>{selected.shippingAddress.line2}</div>}
              <div>
                {selected.shippingAddress.city}
                {selected.shippingAddress.region ? `, ${selected.shippingAddress.region}` : ''}{' '}
                {selected.shippingAddress.postalCode}
              </div>
              <div>{selected.shippingAddress.country}</div>
            </div>

            <h3 className="detail-h">Payments</h3>
            {payments.length === 0 ? (
              <p className="muted small">No payments recorded.</p>
            ) : (
              <table className="table compact">
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span className={`pill pay-${p.status}`}>{p.status.replace('_', ' ')}</span>
                        <div className="muted small">
                          {p.provider}
                          {p.failureReason ? ` — ${p.failureReason}` : ''}
                        </div>
                      </td>
                      <td className="num">{formatMoney(p.amount)}</td>
                      <td className="row-actions">
                        {p.status === 'requires_payment' && (
                          <button
                            className="link"
                            disabled={detailBusy}
                            onClick={() => void runAction(() => api.payments.confirm(p.id))}
                          >
                            Confirm
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Open a payment when the order is payable and none is pending/paid. */}
            {selected.status === 'pending' && !openPayment && !hasSucceeded && (
              <div className="action-row">
                <button
                  type="button"
                  className="secondary"
                  disabled={detailBusy}
                  onClick={() => void runAction(() => api.payments.create(selected.id))}
                >
                  Record payment
                </button>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
