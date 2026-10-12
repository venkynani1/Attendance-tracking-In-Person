'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';
import { Alert } from '@/components/ui';
import { useUser } from '@/components/user-context';

export default function AccountPage() {
  const { user } = useUser();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setOk('');
    if (form.newPassword !== form.confirm) return setError('New passwords do not match.');
    setBusy(true);
    try {
      await api('/api/auth/password', { method: 'POST', body: form });
      setOk('Password changed.');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ maxWidth: 480 }}>
      <div>
        <h1>Account</h1>
        {user && (
          <p className="muted small">
            Signed in as <span className="mono">{user.username}</span> · {user.role === 'MASTER' ? 'Master admin' : 'Admin'}
          </p>
        )}
      </div>
      <form className="card form" onSubmit={submit}>
        <h2>Change password</h2>
        <div className="field">
          <label htmlFor="current">Current password</label>
          <input id="current" type="password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} required />
        </div>
        <div className="field">
          <label htmlFor="new">New password</label>
          <input id="new" type="password" autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} required minLength={8} />
        </div>
        <div className="field">
          <label htmlFor="confirm">Confirm new password</label>
          <input id="confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} required />
        </div>
        <Alert>{error}</Alert>
        <Alert kind="ok">{ok}</Alert>
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Change password'}
        </button>
      </form>
    </div>
  );
}
