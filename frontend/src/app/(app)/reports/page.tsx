'use client';

import { useState } from 'react';
import { useApi } from '@/lib/api';
import { Empty, Notice, PageHeader, Spinner, StatCard } from '@/components/ui';
import { fmtMoney } from '@/lib/format';

interface Summary {
  byStage: { stage: string; label: string; orders: number; sets: number }[];
  monthly: { month: string; orders: number; sets: number; orderValue: number; collected: number }[];
  receivables: { customerId: string; name: string; outstanding: number; orders: number }[];
  delivery: { delivered: number; onTime: number; onTimeRate: number | null; avgLeadDays: number | null };
  products: { product: string; orders: number; sets: number }[];
}

const monthLabel = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
const compact = (n: number) => (n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

export default function ReportsPage() {
  const [months, setMonths] = useState(6);
  const { data, error } = useApi<Summary>(`/reports/summary?months=${months}`);
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  if (error) return <Notice tone="error">{error}</Notice>;
  if (!data) return <Spinner />;

  const totalValue = data.monthly.reduce((s, m) => s + m.orderValue, 0);
  const totalCollected = data.monthly.reduce((s, m) => s + m.collected, 0);
  const totalReceivable = data.receivables.reduce((s, r) => s + r.outstanding, 0);
  const max = Math.max(1, ...data.monthly.flatMap((m) => [m.orderValue, m.collected]));
  const maxStage = Math.max(1, ...data.byStage.map((s) => s.orders));
  const maxRecv = Math.max(1, ...data.receivables.map((r) => r.outstanding));
  const maxSets = Math.max(1, ...data.products.map((p) => p.sets));

  return (
    <>
      <PageHeader
        eyebrow="ANALYTICS"
        title="Business reports"
        subtitle="Order intake, collections, receivables and delivery performance."
        actions={
          <>
            <select className="btn" value={months} onChange={(e) => setMonths(Number(e.target.value))} aria-label="Period">
              <option value={3}>Last 3 months</option>
              <option value={6}>Last 6 months</option>
              <option value={12}>Last 12 months</option>
            </select>
            <a className="btn" href="/api/reports/orders.csv">↓ Export orders (CSV)</a>
          </>
        }
      />
      <div className="stats">
        <StatCard label={`Order value · ${months} mo`} value={fmtMoney(totalValue)} note={`${data.monthly.reduce((s, m) => s + m.orders, 0)} orders · ${data.monthly.reduce((s, m) => s + m.sets, 0)} sets`} icon="↗" />
        <StatCard label={`Collected · ${months} mo`} value={fmtMoney(totalCollected)} note="Payments received" icon="✓" tone="green" />
        <StatCard label="Receivables" value={fmtMoney(totalReceivable)} note="Top 10 customers below" icon="◷" tone={totalReceivable ? 'amber' : 'green'} />
        <StatCard
          label="On-time delivery"
          value={data.delivery.onTimeRate === null ? '—' : `${Math.round(data.delivery.onTimeRate * 100)}%`}
          note={data.delivery.delivered ? `${data.delivery.onTime}/${data.delivery.delivered} orders · avg ${data.delivery.avgLeadDays?.toFixed(1)} days lead time` : 'No deliveries yet'}
          icon="◫"
          tone={data.delivery.onTimeRate !== null && data.delivery.onTimeRate < 0.8 ? 'amber' : 'green'}
        />
      </div>

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div>
            <h2>Order value vs collections by month</h2>
            <div className="card-sub">Orders by creation month; payments by date received (NPR)</div>
          </div>
          <button className="link-btn" onClick={() => setShowTable(!showTable)}>{showTable ? 'Show chart' : 'Show table'}</button>
        </div>
        <div className="legend">
          <span><i className="swatch" style={{ background: 'var(--series-1)' }} />Order value</span>
          <span><i className="swatch" style={{ background: 'var(--series-2)' }} />Collected</span>
        </div>
        {showTable ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Month</th><th className="num">Orders</th><th className="num">Sets</th><th className="num">Order value</th><th className="num">Collected</th></tr></thead>
              <tbody>
                {data.monthly.map((m) => (
                  <tr key={m.month}><td>{monthLabel(m.month)}</td><td className="num">{m.orders}</td><td className="num">{m.sets}</td><td className="num">{fmtMoney(m.orderValue)}</td><td className="num">{fmtMoney(m.collected)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <div className="col-chart" role="img" aria-label="Monthly order value and collections">
              {data.monthly.map((m, i) => (
                <div key={m.month} className="col-group" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0}>
                  <div className="col-bar" style={{ height: `${(m.orderValue / max) * 100}%`, background: 'var(--series-1)' }} />
                  <div className="col-bar" style={{ height: `${(m.collected / max) * 100}%`, background: 'var(--series-2)' }} />
                  {hover === i && (
                    <div className="chart-tip">
                      <strong>{monthLabel(m.month)}</strong>
                      <br />
                      Order value: {fmtMoney(m.orderValue)}
                      <br />
                      Collected: {fmtMoney(m.collected)}
                      <br />
                      {m.orders} orders · {m.sets} sets
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="col-labels">
              {data.monthly.map((m) => <div key={m.month}>{monthLabel(m.month)}<br /><span className="muted">{compact(m.orderValue)}</span></div>)}
            </div>
          </>
        )}
      </section>

      <div className="two-col" style={{ marginBottom: 16 }}>
        <section className="card">
          <div className="card-head"><div><h2>Orders by stage</h2><div className="card-sub">All orders, current stage</div></div></div>
          <div className="stage-list">
            {data.byStage.map((s) => (
              <div className="stage-row" key={s.stage} title={`${s.orders} orders · ${s.sets} sets`}>
                <div className="stage-label">{s.label.replace(' & confirmation', '')}</div>
                <div className="track"><div className="fill" style={{ width: `${(s.orders / maxStage) * 100}%` }} /></div>
                <div className="stage-count">{s.orders}</div>
              </div>
            ))}
          </div>
        </section>
        <section className="card">
          <div className="card-head"><div><h2>Receivables by customer</h2><div className="card-sub">Largest outstanding balances</div></div></div>
          {!data.receivables.length ? <Empty>Nothing outstanding.</Empty> : (
            <div className="stage-list">
              {data.receivables.map((r) => (
                <div className="stage-row" key={r.customerId} style={{ gridTemplateColumns: '130px minmax(0,1fr) 90px' }} title={`${r.orders} orders with a balance`}>
                  <div className="stage-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                  <div className="track"><div className="fill" style={{ width: `${(r.outstanding / maxRecv) * 100}%` }} /></div>
                  <div className="stage-count">{compact(r.outstanding)}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="card flush">
        <div className="card-head" style={{ padding: '18px 18px 0' }}><div><h2>Product mix</h2><div className="card-sub">All-time sets ordered by configuration</div></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Product configuration</th><th className="num">Orders</th><th className="num">Sets</th><th style={{ width: '35%' }}>Share of sets</th></tr></thead>
            <tbody>
              {data.products.map((p) => (
                <tr key={p.product}>
                  <td>{p.product}</td>
                  <td className="num">{p.orders}</td>
                  <td className="num">{p.sets}</td>
                  <td><div className="track"><div className="fill" style={{ width: `${(p.sets / maxSets) * 100}%` }} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
