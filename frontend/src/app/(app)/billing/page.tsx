'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api, useApi } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/Toast';
import { Badge, Empty, Notice, PageHeader, Spinner, StatCard, errorMessage } from '@/components/ui';
import { RecordPaymentModal } from '@/components/OrderModals';
import { fmtDate, fmtMoney } from '@/lib/format';
import type { Order, Payment } from '@/lib/types';

function Billing() {
  const { user, meta } = useAuth();
  const toast = useToast();
  const params = useSearchParams();
  const customerFilter = params.get('customer');
  const isCustomer = user.role === 'customer';
  const canRecord = meta.permissions.includes('payments.record');
  const orders = useApi<{ orders: Order[] }>(`/orders?limit=200${customerFilter ? `&customer=${customerFilter}` : ''}`);
  const payments = useApi<{ payments: Payment[] }>(`/payments?limit=100${customerFilter ? `&customer=${customerFilter}` : ''}`);
  const [tab, setTab] = useState<'invoices' | 'payments'>('invoices');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'' | 'unpaid' | 'part' | 'paid'>('');
  const [recording, setRecording] = useState(false);

  const all = orders.data?.orders ?? [];
  const totals = all.reduce((a, o) => ({ value: a.value + (o.totalAmount ?? 0), paid: a.paid + (o.amountPaid ?? 0), due: a.due + (o.balance ?? 0) }), { value: 0, paid: 0, due: 0 });
  const payState = (o: Order) => (!o.totalAmount ? 'To quote' : o.balance === 0 ? 'Paid' : o.amountPaid ? 'Part paid' : 'Unpaid');
  const q = search.trim().toLowerCase();
  const visible = all.filter((o) => {
    if (q && !`${o.orderNo} ${o.customer.name} ${o.invoice?.number ?? ''}`.toLowerCase().includes(q)) return false;
    const s = payState(o);
    if (filter === 'unpaid') return s === 'Unpaid';
    if (filter === 'part') return s === 'Part paid';
    if (filter === 'paid') return s === 'Paid';
    return true;
  });

  async function deletePayment(p: Payment) {
    if (!confirm(`Delete payment of ${fmtMoney(p.amount)} on ${p.order.orderNo}?`)) return;
    try {
      await api(`/payments/${p.id}`, { method: 'DELETE' });
      toast('Payment deleted');
      payments.reload();
      orders.reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={isCustomer ? 'CUSTOMER PORTAL' : 'ACCOUNTS'}
        title={isCustomer ? 'Invoices & payments' : 'Quotations & billing'}
        subtitle={isCustomer ? 'Your order totals, payments received and balances.' : 'Issue invoices, record full or partial payments and follow up balances.'}
        actions={canRecord && <button className="btn primary" onClick={() => setRecording(true)}>＋ Record payment</button>}
      />
      {customerFilter && (
        <Notice style={{ marginBottom: 15 }}>
          Filtered to one customer. <Link className="link-btn" href="/billing">Show all</Link>
        </Notice>
      )}
      <div className="stats">
        <StatCard label="Order value" value={fmtMoney(totals.value)} note={`${all.length} orders`} icon="▱" />
        <StatCard label="Collected" value={fmtMoney(totals.paid)} note="Payments recorded" icon="↙" tone="green" />
        <StatCard label="Outstanding" value={fmtMoney(totals.due)} note="Total less payments" icon="◷" tone={totals.due ? 'amber' : 'green'} />
        <StatCard label="Invoices issued" value={all.filter((o) => o.invoice?.number).length} note={`${all.filter((o) => !o.totalAmount).length} orders awaiting a price`} icon="▤" />
      </div>
      <div className="toolbar">
        <button className={`btn ${tab === 'invoices' ? 'primary' : ''}`} onClick={() => setTab('invoices')}>Orders & invoices</button>
        <button className={`btn ${tab === 'payments' ? 'primary' : ''}`} onClick={() => setTab('payments')}>Payment ledger</button>
        {tab === 'invoices' && (
          <>
            <div className="search"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice, order or customer…" aria-label="Search" /></div>
            <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Payment status">
              <option value="">All payment states</option>
              <option value="unpaid">Unpaid</option>
              <option value="part">Part paid</option>
              <option value="paid">Paid</option>
            </select>
          </>
        )}
      </div>
      {(orders.error || payments.error) && <Notice tone="error">{orders.error || payments.error}</Notice>}

      {tab === 'invoices' ? (
        <div className="card flush">
          {!orders.data ? <Spinner /> : !visible.length ? <Empty>No orders match.</Empty> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Invoice</th><th>Order</th><th>Customer</th><th className="num">Total</th><th className="num">Paid</th><th className="num">Balance</th><th>Payment</th><th /></tr></thead>
                <tbody>
                  {visible.map((o) => (
                    <tr key={o.id}>
                      <td>{o.invoice?.number ? <strong>{o.invoice.number}</strong> : <span className="muted">Not issued</span>}</td>
                      <td><Link className="order-id" href={`/orders/${o.id}`}>{o.orderNo}</Link></td>
                      <td>{o.customer.name}</td>
                      <td className="num">{o.totalAmount ? fmtMoney(o.totalAmount) : '—'}</td>
                      <td className="num">{fmtMoney(o.amountPaid)}</td>
                      <td className="num">{fmtMoney(o.balance)}</td>
                      <td><Badge>{payState(o)}</Badge></td>
                      <td>{!!o.totalAmount && <Link className="btn small" href={`/invoice/${o.id}`} target="_blank">{o.invoice?.number ? 'Invoice' : 'Quotation'}</Link>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="card flush">
          {!payments.data ? <Spinner /> : !payments.data.payments.length ? <Empty>No payments recorded.</Empty> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Order</th><th>Customer</th><th>Method</th><th>Reference</th><th className="num">Amount</th><th>Recorded by</th>{meta.permissions.includes('payments.delete') && <th />}</tr></thead>
                <tbody>
                  {payments.data.payments.map((p) => (
                    <tr key={p.id}>
                      <td>{fmtDate(p.receivedAt)}</td>
                      <td><Link className="order-id" href={`/orders/${p.order.id}`}>{p.order.orderNo}</Link></td>
                      <td>{p.customer.name}</td>
                      <td>{p.method}</td>
                      <td>{p.reference || '—'}</td>
                      <td className="num"><strong>{fmtMoney(p.amount)}</strong></td>
                      <td>{p.recordedBy || '—'}</td>
                      {meta.permissions.includes('payments.delete') && <td><button className="btn small danger" onClick={() => deletePayment(p)}>Delete</button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {!isCustomer && (
        <Notice style={{ marginTop: 14 }}>
          Invoice numbers are generated by the server in sequence and cannot be edited. Confirm VAT treatment and invoice format with your accountant before going live.
        </Notice>
      )}
      {recording && (
        <RecordPaymentModal
          orders={all}
          onClose={() => setRecording(false)}
          onSaved={() => {
            setRecording(false);
            orders.reload();
            payments.reload();
          }}
        />
      )}
    </>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Billing />
    </Suspense>
  );
}
