'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/Toast';
import { Field, Notice, PageHeader, errorMessage } from '@/components/ui';

export default function SettingsPage() {
  const { meta, settings, refreshSettings } = useAuth();
  const toast = useToast();
  const canManage = meta.permissions.includes('settings.manage');
  const [form, setForm] = useState({ ...settings, dueSoonDays: String(settings.dueSoonDays) });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

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
      toast('Platform settings saved');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="PLATFORM SETTINGS" title="Business profile" subtitle="Configure the business identity, numbering and defaults used across the platform." />
      {!canManage ? <Notice tone="warn">Platform settings are managed by an administrator.</Notice> : (
        <section className="card" style={{ maxWidth: 900 }}>
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
              <Field label="Due soon window (days)"><input type="number" min={1} max={30} value={form.dueSoonDays} onChange={set('dueSoonDays')} /></Field>
              <Field label="Invoice footer" full><input value={form.invoiceFooter} onChange={set('invoiceFooter')} /></Field>
            </div>
            <button className="btn primary" style={{ marginTop: 16 }} disabled={busy}>{busy ? 'Saving…' : 'Save platform settings'}</button>
          </form>
        </section>
      )}
    </>
  );
}
