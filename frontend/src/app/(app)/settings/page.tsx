'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/Toast';
import { Field, Notice, PageHeader, errorMessage } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/format';

export default function SettingsPage() {
  const { user, settings, refreshSettings } = useAuth();
  const toast = useToast();
  const isOwner = user.role === 'owner';
  const [form, setForm] = useState({ ...settings, dueSoonDays: String(settings.dueSoonDays) });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/settings', {
        method: 'PUT',
        body: {
          businessName: form.businessName, address: form.address, phone: form.phone, email: form.email, panNumber: form.panNumber,
          orderPrefix: form.orderPrefix.toUpperCase(), invoicePrefix: form.invoicePrefix.toUpperCase(), dueSoonDays: Number(form.dueSoonDays), invoiceFooter: form.invoiceFooter,
        },
      });
      await refreshSettings();
      toast('Settings saved');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="CONFIGURATION" title="Settings" subtitle={isOwner ? 'Business profile, numbering and your account.' : 'Your account.'} />
      <div className="two-col">
        {isOwner && (
          <section className="card">
            <h2>Business profile</h2>
            <div className="card-sub" style={{ marginBottom: 16 }}>Shown on quotations and invoices</div>
            {error && <Notice tone="error" style={{ marginBottom: 14 }}>{error}</Notice>}
            <form onSubmit={save}>
              <div className="form-grid">
                <Field label="Registered business name *" full><input required value={form.businessName} onChange={set('businessName')} /></Field>
                <Field label="Address" full><input value={form.address} onChange={set('address')} /></Field>
                <Field label="Phone"><input value={form.phone} onChange={set('phone')} /></Field>
                <Field label="Email"><input value={form.email} onChange={set('email')} /></Field>
                <Field label="PAN / VAT number"><input value={form.panNumber} onChange={set('panNumber')} /></Field>
                <Field label="Currency / timezone"><input value={`${form.currency} · ${form.timezone}`} disabled /></Field>
                <Field label="Order number prefix" hint={`Next orders: ${form.orderPrefix.toUpperCase()}-#####`}><input required value={form.orderPrefix} onChange={set('orderPrefix')} /></Field>
                <Field label="Invoice prefix" hint={`e.g. ${form.invoicePrefix.toUpperCase()}-${new Date().getFullYear()}-0001`}><input required value={form.invoicePrefix} onChange={set('invoicePrefix')} /></Field>
                <Field label="&quot;Due soon&quot; window (days)"><input type="number" min={1} max={30} value={form.dueSoonDays} onChange={set('dueSoonDays')} /></Field>
                <Field label="Invoice footer" full><input value={form.invoiceFooter} onChange={set('invoiceFooter')} /></Field>
              </div>
              <button className="btn primary" style={{ marginTop: 16 }} disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
            </form>
          </section>
        )}
        <div className="stack">
          <section className="card">
            <h2>My account</h2>
            <div className="kv"><span>Name</span><strong>{user.name}</strong></div>
            <div className="kv"><span>Email</span><strong>{user.email}</strong></div>
            <div className="kv"><span>Role</span><strong>{ROLE_LABELS[user.role]}</strong></div>
            {user.customer && <div className="kv"><span>Customer account</span><strong>{user.customer.name}</strong></div>}
          </section>
          <ChangePassword />
        </div>
      </div>
    </>
  );
}

function ChangePassword() {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.newPassword !== form.confirm) {
      setError('New passwords do not match');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api('/auth/change-password', { method: 'POST', body: { currentPassword: form.currentPassword, newPassword: form.newPassword } });
      toast('Password changed');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card">
      <h2 style={{ marginBottom: 14 }}>Change password</h2>
      {error && <Notice tone="error" style={{ marginBottom: 14 }}>{error}</Notice>}
      <form onSubmit={submit} className="form-grid">
        <Field label="Current password" full><input type="password" required autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} /></Field>
        <Field label="New password" hint="At least 8 characters"><input type="password" required minLength={8} autoComplete="new-password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} /></Field>
        <Field label="Confirm new password"><input type="password" required autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} /></Field>
        <div className="field full"><button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button></div>
      </form>
    </section>
  );
}
