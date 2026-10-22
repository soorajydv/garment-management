'use client';

import Link from 'next/link';
import { useApi } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { Badge, DueDate, Empty, Notice, OrderTable, PageHeader, Spinner, StatCard } from '@/components/ui';
import { canSeeMoney, fmtDateTime, fmtMoney, STAGE_SHORT } from '@/lib/format';
import type { Order, Stage } from '@/lib/types';

interface Dashboard {
  counts: { active: number; awaitingApproval: number; dueSoon: number; overdue: number; readyToDispatch: number; deliveredThisMonth: number };
  byStage: Record<Stage, number>;
  dueSoonDays: number;
  money?: { orderValue: number; collected: number; outstanding: number };
  recentOrders: Order[];
  approvals: Order[];
  dueSoonOrders: Order[];
  lowStock?: number;
  activity?: { id: string; actorName: string; summary: string; at: string }[];
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, error } = useApi<Dashboard>('/dashboard');
  const isCustomer = user.role === 'customer';
  const canCreate = ['owner', 'accounts', 'customer'].includes(user.role);

  if (error) return <Notice tone="error">{error}</Notice>;
  if (!data) return <Spinner />;
  const { counts, byStage } = data;
  const workStages: Stage[] = ['design', 'printing', 'stitching', 'finishing', 'ready'];
  const maxStage = Math.max(1, ...workStages.map((s) => byStage[s]));

  return (
    <>
      <PageHeader
        eyebrow={isCustomer ? 'CUSTOMER PORTAL' : 'LIVE WORKSPACE'}
        title={isCustomer ? `Welcome back, ${user.customer?.name ?? user.name}` : `${greeting()}, ${user.name.split(' ').pop()}.`}
        subtitle="A clear view of order progress, production priorities and next actions."
        actions={canCreate && <Link href="/orders/new" className="btn primary">＋ {isCustomer ? 'Place an order' : 'Create order'}</Link>}
      />

      <div className="stats">
        <StatCard label={isCustomer ? 'My active orders' : 'Active orders'} value={counts.active} note="Not yet delivered" icon="▤" />
        <StatCard label={isCustomer ? 'Need my approval' : 'Awaiting approval'} value={counts.awaitingApproval} note={isCustomer ? 'Review artwork versions' : 'Customer design confirmation'} icon="✓" tone={counts.awaitingApproval ? 'amber' : ''} />
        <StatCard label="Due soon" value={counts.dueSoon} note={`Within ${data.dueSoonDays} days${counts.overdue ? ` · ${counts.overdue} overdue` : ''}`} icon="◷" tone={counts.overdue ? 'red' : counts.dueSoon ? 'amber' : 'green'} />
        {data.money ? (
          <StatCard label={isCustomer ? 'Balance due' : 'Outstanding'} value={fmtMoney(data.money.outstanding)} note={`${fmtMoney(data.money.collected)} collected of ${fmtMoney(data.money.orderValue)}`} icon="↗" tone={data.money.outstanding ? 'amber' : 'green'} />
        ) : (
          <StatCard label="Low-stock materials" value={data.lowStock ?? 0} note="Below reorder level" icon="▧" tone={data.lowStock ? 'amber' : 'green'} />
        )}
      </div>

      <div className="grid-main">
        <section className="card">
          <div className="card-head">
            <div>
              <h2>{isCustomer ? 'My recent orders' : 'Recent orders'}</h2>
              <div className="card-sub">Select an order number to open its detail view.</div>
            </div>
            <Link className="link-btn" href="/orders">View all →</Link>
          </div>
          <OrderTable orders={data.recentOrders} showMoney={false} compact />
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h2>{isCustomer ? 'Order progress' : 'Production workload'}</h2>
              <div className="card-sub">Open orders by current stage</div>
            </div>
          </div>
          <div className="stage-list">
            {workStages.map((s) => (
              <div className="stage-row" key={s}>
                <div className="stage-label">{STAGE_SHORT[s]}</div>
                <div className="track"><div className="fill" style={{ width: `${(byStage[s] / maxStage) * 100}%` }} /></div>
                <div className="stage-count">{byStage[s]}</div>
              </div>
            ))}
          </div>
          <Notice style={{ marginTop: 22 }}>
            <strong>Approval gate active</strong>
            <br />
            Printing only starts after the customer approves the latest artwork version.
          </Notice>
        </section>
      </div>

      <div style={{ height: 16 }} />
      <div className="grid-main">
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Priority follow-up</h2>
              <div className="card-sub">Design approvals and orders due soon</div>
            </div>
          </div>
          <div className="activity">
            {data.approvals.map((o) => (
              <Link href={`/orders/${o.id}`} className="activity-item" key={`a-${o.id}`}>
                <div className="activity-dot">✎</div>
                <div>
                  <div className="activity-title">{o.customer.name} · {o.orderNo}</div>
                  <div className="activity-desc">
                    <Badge>{o.status}</Badge> {o.currentVersion ? `Artwork v${o.currentVersion}` : 'No artwork uploaded yet'}
                  </div>
                  <div className="activity-time">Due <DueDate order={o} /></div>
                </div>
              </Link>
            ))}
            {data.dueSoonOrders
              .filter((o) => !data.approvals.some((a) => a.id === o.id))
              .map((o) => (
                <Link href={`/orders/${o.id}`} className="activity-item" key={`d-${o.id}`}>
                  <div className="activity-dot">◷</div>
                  <div>
                    <div className="activity-title">{o.customer.name} · {o.orderNo}</div>
                    <div className="activity-desc">{o.stageLabel} · {o.quantity} sets</div>
                    <div className="activity-time">Due <DueDate order={o} /></div>
                  </div>
                </Link>
              ))}
            {!data.approvals.length && !data.dueSoonOrders.length && <Empty>Nothing needs follow-up right now.</Empty>}
          </div>
        </section>

        <section className="card">
          {data.activity ? (
            <>
              <div className="card-head">
                <div>
                  <h2>Recent activity</h2>
                  <div className="card-sub">From the audit log</div>
                </div>
                <Link className="link-btn" href="/activity">All →</Link>
              </div>
              <div className="activity">
                {data.activity.map((a) => (
                  <div className="activity-item" key={a.id}>
                    <div className="activity-dot">•</div>
                    <div>
                      <div className="activity-desc" style={{ marginTop: 0 }}>{a.summary}</div>
                      <div className="activity-time">{a.actorName} · {fmtDateTime(a.at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="card-head">
                <div>
                  <h2>Quick actions</h2>
                  <div className="card-sub">Common workflows</div>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 9 }}>
                {canCreate && <Link className="btn" href="/orders/new" style={{ justifyContent: 'flex-start' }}>＋ {isCustomer ? 'Place a new order' : 'Register a new order'}</Link>}
                {!isCustomer && user.role !== 'accounts' && <Link className="btn" href="/production" style={{ justifyContent: 'flex-start' }}>◫ Open production board</Link>}
                {canSeeMoney(user.role) && <Link className="btn" href="/billing" style={{ justifyContent: 'flex-start' }}>▱ {isCustomer ? 'View invoices & payments' : 'Billing & payments'}</Link>}
                {!isCustomer && user.role !== 'accounts' && <Link className="btn" href="/inventory" style={{ justifyContent: 'flex-start' }}>▧ Check stock levels</Link>}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
