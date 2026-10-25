'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApi } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { Notice, OrderTable, PageHeader, Spinner } from '@/components/ui';
import { canSeeMoney } from '@/lib/format';
import type { Order } from '@/lib/types';

const STATUSES = ['Design in progress', 'Awaiting approval', 'Changes requested', 'Design approved', 'In production', 'Quality check', 'Ready to dispatch', 'Delivered'];
const PAGE_SIZE = 50;

export default function OrdersPage() {
  const { user, meta } = useAuth();
  const isCustomer = user.role === 'customer';
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [stage, setStage] = useState('');
  const [status, setStatus] = useState('');
  const [overdue, setOverdue] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [debounced, stage, status, overdue]);

  const qs = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (debounced) qs.set('search', debounced);
  if (stage) qs.set('stage', stage);
  if (status) qs.set('status', status);
  if (overdue) qs.set('due', 'overdue');
  const { data, error, loading } = useApi<{ orders: Order[]; total: number }>(`/orders?${qs}`);
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <PageHeader
        eyebrow={isCustomer ? 'CUSTOMER PORTAL' : 'ORDER REGISTER'}
        title={isCustomer ? 'My orders' : 'Order management'}
        subtitle="Track every order from first request through delivery."
        actions={meta.permissions.includes('orders.create') && <Link href="/orders/new" className="btn primary">＋ {isCustomer ? 'Place an order' : 'Create order'}</Link>}
      />
      <div className="toolbar">
        <div className="search">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order number, team or customer…" aria-label="Search orders" />
        </div>
        <select value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Stage">
          <option value="">All stages</option>
          {meta.stages.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <label className="btn" style={{ fontWeight: 600 }}>
          <input type="checkbox" checked={overdue} onChange={(e) => setOverdue(e.target.checked)} /> Overdue only
        </label>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
  <div className="card flush">{!data && loading ? <Spinner /> : <OrderTable orders={data?.orders ?? []} showMoney={canSeeMoney(user.role, meta.permissions)} />}</div>
      {data && (
        <div className="toolbar" style={{ marginTop: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="subtitle">{data.total} order{data.total === 1 ? '' : 's'}{user.role !== 'owner' && user.role !== 'accounts' && !isCustomer ? ' in your department queue' : ''}</div>
          {pages > 1 && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button className="btn small" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
              <span className="small muted">Page {page} of {pages}</span>
              <button className="btn small" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next →</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
