'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { Alert, BrandMark } from '@/components/ui';

function LoginForm() {
  const params = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    api('/api/setup')
      .then((d) => setNeedsSetup(Boolean(d.needsSetup)))
      .catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api('/api/auth/login', { method: 'POST', body: { username, password } });
      const next = params.get('next');
      window.location.href = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="card auth-card">
      <div className="auth-brand">
        <BrandMark />
        <div>
          <h1 style={{ fontSize: '1.25rem' }}>Training Attendance</h1>
          <p className="muted small">Sign in to manage trainings</p>
        </div>
      </div>

      {needsSetup && (
        <div style={{ marginBottom: 14 }}>
          <Alert kind="info">
            No master admin exists yet. <Link href="/setup">Run first-time setup</Link>.
          </Alert>
        </div>
      )}

      <form className="form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="username">Username</label>
          <input id="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <Alert>{error}</Alert>
        <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="muted small text-center" style={{ marginTop: 16 }}>
        New admin? <Link href="/signup">Request access</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="center-screen">
      <Suspense fallback={<div className="card auth-card"><div className="skeleton" style={{ height: 220 }} /></div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
