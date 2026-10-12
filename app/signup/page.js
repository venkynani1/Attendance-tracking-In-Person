'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { Alert, BrandMark } from '@/components/ui';

export default function SignupPage() {
  const [form, setForm] = useState({ displayName: '', username: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    setBusy(true);
    try {
      await api('/api/auth/signup', { method: 'POST', body: form });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="center-screen">
      <div className="card auth-card">
        <div className="auth-brand">
          <BrandMark />
          <div>
            <h1 style={{ fontSize: '1.25rem' }}>Request admin access</h1>
            <p className="muted small">The master admin approves new accounts</p>
          </div>
        </div>

        {done ? (
          <div className="stack">
            <Alert kind="ok">Request sent. You can sign in once the master admin approves it.</Alert>
            <Link className="btn btn-block" href="/login">Back to sign in</Link>
          </div>
        ) : (
          <form className="form" onSubmit={submit}>
            <div className="field">
              <label htmlFor="displayName">Your name</label>
              <input id="displayName" value={form.displayName} onChange={set('displayName')} placeholder="e.g. Priya S" />
            </div>
            <div className="field">
              <label htmlFor="username">Username</label>
              <input id="username" autoComplete="username" value={form.username} onChange={set('username')} required />
              <span className="hint">3–40 characters: letters, numbers, @ . _ -</span>
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} required minLength={8} />
              <span className="hint">At least 8 characters</span>
            </div>
            <div className="field">
              <label htmlFor="confirm">Confirm password</label>
              <input id="confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} required />
            </div>
            <Alert>{error}</Alert>
            <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
              {busy ? 'Sending…' : 'Send request'}
            </button>
            <p className="muted small text-center">
              Already approved? <Link href="/login">Sign in</Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
