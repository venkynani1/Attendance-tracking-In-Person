'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, safeStorage } from '@/lib/api-client';
import { formatTime } from '@/lib/format';
import { Alert, BrandMark } from '@/components/ui';

const SAVED_KEY = 'attendance.participant';

function ClosedMessage({ reason }) {
  return (
    <div className="text-center stack">
      <div className="big-icon closed">■</div>
      <h2>Attendance is closed</h2>
      <p className="muted">
        {reason === 'AUTO'
          ? 'The attendance window for this training has ended.'
          : 'Attendance was closed by the admin.'}{' '}
        Please contact your trainer if you need help.
      </p>
    </div>
  );
}

export default function AttendPage() {
  const { token } = useParams();
  const [training, setTraining] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ employeeId: '', employeeName: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const loadStatus = useCallback(async () => {
    try {
      const d = await api(`/api/attend/${token}`);
      setTraining(d.training);
      setLoadError('');
    } catch (err) {
      if (err.status === 404) setLoadError(err.message);
      // Other errors (e.g. brief network drop) keep the current screen.
      else if (!training) setLoadError(err.message);
    }
  }, [token, training]);

  useEffect(() => {
    loadStatus();
    // Prefill details from this phone's last submission.
    const saved = safeStorage().get(SAVED_KEY);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        setForm({ employeeId: p.employeeId || '', employeeName: p.employeeName || '' });
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // While the form is open, check every 15 s whether the admin has closed attendance.
  useEffect(() => {
    if (!training?.isOpen || done) return;
    const t = setInterval(loadStatus, 15000);
    return () => clearInterval(t);
  }, [training?.isOpen, done, loadStatus]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await api(`/api/attend/${token}`, { method: 'POST', body: form });
      safeStorage().set(SAVED_KEY, JSON.stringify({ employeeId: r.employeeId, employeeName: r.employeeName }));
      setDone(r);
    } catch (err) {
      if (err.data?.closed) setTraining(err.data.training);
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="center-screen">
      <div className="card attend-card">
        <div className="auth-brand">
          <BrandMark />
          <span className="muted small">Training attendance</span>
        </div>

        {!training && !loadError && <div className="skeleton" style={{ height: 220 }} />}

        {loadError && (
          <div className="text-center stack">
            <div className="big-icon err">!</div>
            <p>{loadError}</p>
            <button className="btn" onClick={loadStatus}>Try again</button>
          </div>
        )}

        {training && !loadError && (
          <div className="stack">
            <div>
              <h1 style={{ fontSize: '1.35rem' }}>{training.name}</h1>
              <p className="muted small" style={{ marginTop: 4 }}>
                {training.dateLabel}
                {training.trainer ? ` · ${training.trainer}` : ''}
                {training.location ? ` · ${training.location}` : ''}
              </p>
            </div>

            {done ? (
              <div className="text-center stack">
                <div className="big-icon ok">✓</div>
                <h2>You&apos;re marked present</h2>
                <p className="muted">
                  {done.employeeName} ({done.employeeId}) at {formatTime(done.submittedAt)}
                </p>
                <p className="small muted">You can close this page.</p>
              </div>
            ) : !training.isOpen ? (
              <ClosedMessage reason={training.closedReason} />
            ) : (
              <form className="form" onSubmit={submit}>
                <div className="field">
                  <label htmlFor="employeeId">Employee ID</label>
                  <input
                    id="employeeId"
                    value={form.employeeId}
                    onChange={set('employeeId')}
                    autoCapitalize="characters"
                    autoComplete="off"
                    inputMode="text"
                    required
                    maxLength={40}
                  />
                </div>
                <div className="field">
                  <label htmlFor="employeeName">Full name</label>
                  <input id="employeeName" value={form.employeeName} onChange={set('employeeName')} autoComplete="name" required maxLength={120} />
                </div>
                <Alert>{error}</Alert>
                <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
                  {busy ? 'Submitting…' : 'Mark me present'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
