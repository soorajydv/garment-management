'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, api, useApi } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/Toast';
import { Field, Notice, PageHeader } from '@/components/ui';
import { fmtMoney, toInputDate } from '@/lib/format';
import type { Customer, Order, Player } from '@/lib/types';

const NEW_CUSTOMER = '__new__';
const MAX_ROWS_RENDERED = 300;

const emptyPlayer = (sleeve: string): Player => ({ name: '', number: '', sleeve, jerseySize: '', shortsSize: '', trouserSize: '' });

export default function NewOrderPage() {
  const { user, meta } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const isCustomer = user.role === 'customer';
  const { data: customerData } = useApi<{ customers: Customer[] }>(isCustomer ? null : '/customers');

  const defaultDue = new Date();
  defaultDue.setDate(defaultDue.getDate() + 14);

  const [customerId, setCustomerId] = useState('');
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  const [teamName, setTeamName] = useState('');
  const [productConfig, setProductConfig] = useState(meta.productConfigs[0]);
  const [neckType, setNeckType] = useState(meta.neckTypes[0]);
  const [shortsColor, setShortsColor] = useState('');
  const [quantity, setQuantity] = useState(18);
  const [dueDate, setDueDate] = useState(toInputDate(defaultDue));
  const [unitRate, setUnitRate] = useState('1800');
  const [advance, setAdvance] = useState('0');
  const [advanceMethod, setAdvanceMethod] = useState(meta.paymentMethods[0]);
  const [comments, setComments] = useState('');
  const [jerseyImage, setJerseyImage] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [players, setPlayers] = useState<Player[]>(() => Array.from({ length: 18 }, () => emptyPlayer('Half sleeve')));
  const [defaultSleeve, setDefaultSleeve] = useState('Half sleeve');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const cfg = productConfig.toLowerCase();
  const hasShorts = cfg.includes('shorts');
  const hasTrouser = cfg.includes('trouser');
  const plainShorts = cfg.includes('plain shorts');
  const qty = Math.max(1, Math.min(5000, quantity || 1));
  const visibleRows = Math.min(qty, MAX_ROWS_RENDERED);

  // Keep one roster row per piece, preserving what has been typed.
  const rows = useMemo(() => Array.from({ length: visibleRows }, (_, i) => players[i] ?? emptyPlayer(defaultSleeve)), [players, visibleRows, defaultSleeve]);

  function updatePlayer(i: number, patch: Partial<Player>) {
    setPlayers(() => {
      const next = [...rows];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }

  function applySleeveToAll(sleeve: string) {
    setDefaultSleeve(sleeve);
    setPlayers(rows.map((p) => ({ ...p, sleeve })));
  }

  /** Accepts rows pasted from a spreadsheet: name, number, jersey size, shorts/trouser size. */
  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>, start: number) {
    const text = e.clipboardData.getData('text');
    if (!text.includes('\t') && !text.includes('\n')) return;
    e.preventDefault();
    const lines = text.trim().split(/\r?\n/);
    const next = [...rows];
    lines.forEach((line, j) => {
      const i = start + j;
      if (i >= next.length) return;
      const [name = '', number = '', jersey = '', bottom = ''] = line.split('\t').map((c) => c.trim());
      const up = (s: string) => (meta.sizes.includes(s.toUpperCase()) ? s.toUpperCase() : '');
      next[i] = { ...next[i], name, number, jerseySize: up(jersey), shortsSize: hasShorts ? up(bottom) : '', trouserSize: hasTrouser ? up(bottom) : '' };
    });
    setPlayers(next);
    toast(`Pasted ${Math.min(lines.length, next.length - start)} player rows`);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    if (!isCustomer && !customerId) {
      setFieldErrors({ customerId: 'Select a customer' });
      return;
    }
    setBusy(true);
    const filledPlayers = rows
      .filter((p) => p.name || p.number || p.jerseySize)
      .map((p) => ({ ...p, shortsSize: hasShorts ? p.shortsSize : '', trouserSize: hasTrouser ? p.trouserSize : '' }));
    const data = {
      customerId: customerId && customerId !== NEW_CUSTOMER ? customerId : undefined,
      newCustomer: customerId === NEW_CUSTOMER ? newCustomer : undefined,
      teamName: teamName || undefined,
      productConfig,
      neckType,
      shortsColor: plainShorts ? shortsColor : '',
      quantity: qty,
      dueDate,
      unitRate: isCustomer ? 0 : Number(unitRate) || 0,
      advance: isCustomer ? 0 : Number(advance) || 0,
      advanceMethod,
      players: filledPlayers,
      comments,
    };
    const form = new FormData();
    form.append('data', JSON.stringify(data));
    if (jerseyImage) form.append('jerseyImage', jerseyImage);
    files.forEach((f) => form.append('files', f));
    try {
      const { order } = await api<{ order: Order }>('/orders', { method: 'POST', form });
      toast(`Order ${order.orderNo} created`);
      router.push(`/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create order');
      if (err instanceof ApiError && err.details) setFieldErrors(err.details);
      setBusy(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  const sizeSelect = (value: string, onChange: (v: string) => void, disabled: boolean, label: string) => (
    <select aria-label={label} value={disabled ? '' : value} disabled={disabled} onChange={(e) => onChange(e.target.value)} style={{ width: 72 }}>
      <option value="">—</option>
      {meta.sizes.map((s) => <option key={s}>{s}</option>)}
    </select>
  );

  return (
    <form onSubmit={submit}>
      <PageHeader
        eyebrow={isCustomer ? 'CUSTOMER PORTAL' : 'ORDER REGISTER'}
        title={isCustomer ? 'Place a new order' : 'Create customer order'}
        subtitle={isCustomer ? 'Tell us about your kit. Our team will prepare the artwork and a price for your approval.' : 'Register the kit specification, roster and any advance received.'}
      />
      {error && <Notice tone="error" style={{ marginBottom: 16 }}>{error}</Notice>}

      <div className="stack">
        <section className="card">
          <h2 style={{ marginBottom: 16 }}>Customer & kit</h2>
          <div className="form-grid">
            {!isCustomer && (
              <Field label="Customer / club *" error={fieldErrors.customerId}>
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">Select customer…</option>
                  <option value={NEW_CUSTOMER}>＋ New customer</option>
                  {customerData?.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
            )}
            {customerId === NEW_CUSTOMER && (
              <>
                <Field label="New customer name *">
                  <input required value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} placeholder="e.g. Kathmandu Warriors" />
                </Field>
                <Field label="Phone">
                  <input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
                </Field>
              </>
            )}
            <Field label="Team name on order" hint="Defaults to the customer name">
              <input value={teamName} onChange={(e) => setTeamName(e.target.value)} />
            </Field>
            <Field label="Product configuration *" full error={fieldErrors.productConfig}>
              <select value={productConfig} onChange={(e) => setProductConfig(e.target.value)}>
                {meta.productConfigs.map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Neck type *">
              <select value={neckType} onChange={(e) => setNeckType(e.target.value)}>
                {meta.neckTypes.map((n) => <option key={n}>{n}</option>)}
              </select>
            </Field>
            <Field label="Shorts colour" hint={!hasShorts ? 'Shorts not selected' : !plainShorts ? 'Not needed for full sublimation shorts' : undefined}>
              <input value={plainShorts ? shortsColor : ''} disabled={!plainShorts} onChange={(e) => setShortsColor(e.target.value)} placeholder={plainShorts ? 'e.g. black, navy blue' : ''} />
            </Field>
            <Field label="Quantity (sets) *" error={fieldErrors.quantity}>
              <input type="number" min={1} max={5000} required value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
            </Field>
            <Field label="Requested delivery date *" error={fieldErrors.dueDate}>
              <input type="date" required min={toInputDate(new Date())} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
            {!isCustomer && (
              <>
                <Field label="Unit rate (NPR)" hint={`Order total: ${fmtMoney((Number(unitRate) || 0) * qty)}`}>
                  <input type="number" min={0} step="any" value={unitRate} onChange={(e) => setUnitRate(e.target.value)} />
                </Field>
                <Field label="Advance received (NPR)" error={fieldErrors.advance}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input type="number" min={0} step="any" value={advance} onChange={(e) => setAdvance(e.target.value)} />
                    <select value={advanceMethod} onChange={(e) => setAdvanceMethod(e.target.value)} style={{ width: 130 }} aria-label="Advance method">
                      {meta.paymentMethods.map((m) => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                </Field>
              </>
            )}
          </div>
        </section>

        <section className="card">
          <h2 style={{ marginBottom: 16 }}>Design references</h2>
          <div className="form-grid">
            <Field label="Jersey image" hint="A picture of the jersey design you want (PNG, JPG, PDF…)">
              <input type="file" accept="image/*,.pdf" onChange={(e) => setJerseyImage(e.target.files?.[0] ?? null)} />
            </Field>
            <Field label="Logos / artwork files" hint="Up to 10 files: images, PDF, AI, EPS, SVG, PSD, CDR">
              <input type="file" multiple accept="image/*,.pdf,.ai,.eps,.svg,.psd,.cdr" onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 10))} />
            </Field>
            <Field label="Comments / special instructions" full>
              <textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Colour notes, sponsor placement, special requests…" />
            </Field>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h2>Player names, numbers & sizes</h2>
              <div className="card-sub">
                One row per set. Leave rows blank if you&apos;ll send the list later. Tip: paste from a spreadsheet (Name ⇥ Number ⇥ Jersey size ⇥ {hasTrouser ? 'Trouser' : 'Shorts'} size) into the first name cell.
              </div>
            </div>
            <select className="btn small" value={defaultSleeve} onChange={(e) => applySleeveToAll(e.target.value)} aria-label="Sleeve for all players">
              {meta.sleeves.map((s) => <option key={s} value={s}>All: {s}</option>)}
            </select>
          </div>
          {qty > MAX_ROWS_RENDERED && <Notice tone="warn" style={{ marginBottom: 10 }}>Showing the first {MAX_ROWS_RENDERED} rows. Larger rosters can be shared as a file.</Notice>}
          <div className="table-wrap">
            <table className="player-table">
              <thead>
                <tr><th>#</th><th>Player name</th><th>No.</th><th>Sleeve</th><th>Jersey</th><th>Shorts</th><th>Trouser</th></tr>
              </thead>
              <tbody>
                {rows.map((p, i) => (
                  <tr key={i}>
                    <td className="muted">{i + 1}</td>
                    <td><input aria-label={`Player ${i + 1} name`} value={p.name} onChange={(e) => updatePlayer(i, { name: e.target.value })} onPaste={(e) => handlePaste(e, i)} placeholder="Name" style={{ width: 150 }} /></td>
                    <td><input aria-label={`Player ${i + 1} number`} value={p.number} onChange={(e) => updatePlayer(i, { number: e.target.value })} placeholder="No." style={{ width: 56 }} /></td>
                    <td>
                      <select aria-label={`Player ${i + 1} sleeve`} value={p.sleeve} onChange={(e) => updatePlayer(i, { sleeve: e.target.value })} style={{ width: 108 }}>
                        {meta.sleeves.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>{sizeSelect(p.jerseySize, (v) => updatePlayer(i, { jerseySize: v }), false, `Player ${i + 1} jersey size`)}</td>
                    <td>{sizeSelect(p.shortsSize, (v) => updatePlayer(i, { shortsSize: v }), !hasShorts, `Player ${i + 1} shorts size`)}</td>
                    <td>{sizeSelect(p.trouserSize, (v) => updatePlayer(i, { trouserSize: v }), !hasTrouser, `Player ${i + 1} trouser size`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="form-actions">
        <button type="button" className="btn" onClick={() => router.back()}>Cancel</button>
        <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : isCustomer ? 'Submit order' : 'Create order'}</button>
      </div>
    </form>
  );
}
