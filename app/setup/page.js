'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { Alert, BrandMark } from '@/components/ui';

export default function SetupPage() {
  const [state, setState] = useState({ loading: true });
  const [form, setForm] = useState({ setupKey: '', displayName: '', username: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/api/setup')
      .then((d) => setState({ loading: false, ...d }))
      .catch((err) => setState({ loading: false, loadError: err.message }));
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    setBusy(true);
    try {
      await api('/api/setup', { method: 'POST', body: form });
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <main className="center-screen">
      <div className="card auth-card">
        <div className="auth-brand">
          <BrandMark />
          <div>
            <h1 style={{ fontSize: '1.25rem' }}>First-time setup</h1>
            <p className="muted small">Create the master admin account</p>
          </div>
        </div>

        {state.loading && <div className="skeleton" style={{ height: 160 }} />}
        {state.loadError && <Alert>{`Could not reach the server: ${state.loadError}`}</Alert>}

        {!state.loading && !state.loadError && !state.needsSetup && (
          <div className="stack">
            <Alert kind="ok">Setup is already complete.</Alert>
            <Link className="btn btn-block" href="/login">Go to sign in</Link>
          </div>
        )}

        {state.needsSetup && (
          <form className="form" onSubmit={submit}>
            {!state.setupKeyConfigured && (
              <Alert kind="warn">SETUP_KEY is not set on the server yet. Add it in Vercel → Settings → Environment Variables, then redeploy.</Alert>
            )}
            <div className="field">
              <label htmlFor="setupKey">Setup key</label>
              <input id="setupKey" type="password" value={form.setupKey} onChange={set('setupKey')} required />
              <span className="hint">The SETUP_KEY value from your environment variables</span>
            </div>
            <div className="divider" />
            <div className="field">
              <label htmlFor="displayName">Your name</label>
              <input id="displayName" value={form.displayName} onChange={set('displayName')} />
            </div>
            <div className="field">
              <label htmlFor="username">Username</label>
              <input id="username" autoComplete="username" value={form.username} onChange={set('username')} required />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} required minLength={8} />
            </div>
            <div className="field">
              <label htmlFor="confirm">Confirm password</label>
              <input id="confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} required />
            </div>
            <Alert>{error}</Alert>
            <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
              {busy ? 'Creating…' : 'Create master admin'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
