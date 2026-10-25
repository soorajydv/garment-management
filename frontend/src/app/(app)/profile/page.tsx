'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/Toast';
import { Field, Notice, PageHeader, errorMessage } from '@/components/ui';
import { roleLabel } from '@/lib/format';

export default function ProfilePage() {
  const { user, meta, refreshUser, logout } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: user.name, phone: user.phone });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/auth/profile', { method: 'PATCH', body: form });
      await refreshUser();
      toast('Profile updated');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="YOUR ACCOUNT" title="My profile" subtitle="Manage your personal information, password and account." />
      {error && <Notice tone="error" style={{ marginBottom: 16 }}>{error}</Notice>}
      <div className="two-col">
        <section className="card">
          <h2>Profile information</h2>
          <div className="card-sub" style={{ marginBottom: 16 }}>These details are shown to your team.</div>
          <form onSubmit={saveProfile} className="form-grid">
            <Field label="Full name *" full><input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Email"><input value={user.email} disabled /></Field>
            <Field label="Role"><input value={roleLabel(user.role, meta.roles)} disabled /></Field>
            {user.customer && <Field label="Customer account" full><input value={user.customer.name} disabled /></Field>}
            <div className="field full"><button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button></div>
          </form>
        </section>
        <div className="stack">
          <ChangePassword />
          <DeleteAccount logout={logout} />
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
    if (form.newPassword !== form.confirm) { setError('New passwords do not match'); return; }
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
  return <section className="card">
    <h2>Change password</h2>
    {error && <Notice tone="error" style={{ margin: '12px 0' }}>{error}</Notice>}
    <form onSubmit={submit} className="form-grid" style={{ marginTop: 14 }}>
      <Field label="Current password" full><input type="password" required autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} /></Field>
      <Field label="New password" hint="At least 8 characters"><input type="password" required minLength={8} autoComplete="new-password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} /></Field>
      <Field label="Confirm new password"><input type="password" required autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} /></Field>
      <div className="field full"><button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button></div>
    </form>
  </section>;
}

function DeleteAccount({ logout }: { logout: () => Promise<void> }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm('Delete your account permanently? This cannot be undone.')) return;
    setBusy(true);
    setError('');
    try {
      await api('/auth/account', { method: 'DELETE', body: { password } });
      await logout();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }
  return <section className="card">
    <h2 className="red">Delete account</h2>
    <div className="card-sub" style={{ marginBottom: 14 }}>This permanently removes your account and cannot be undone.</div>
    {error && <Notice tone="error" style={{ marginBottom: 14 }}>{error}</Notice>}
    <form onSubmit={submit}>
      <Field label="Current password" hint="Required to confirm account deletion"><input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      <button className="btn danger" style={{ marginTop: 16 }} disabled={busy}>{busy ? 'Deleting…' : 'Delete my account'}</button>
    </form>
  </section>;
}
