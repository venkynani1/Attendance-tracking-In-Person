'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, safeStorage } from '@/lib/api-client';
import { formatTime, normalizeName } from '@/lib/format';
import { Alert, BrandMark } from '@/components/ui';

const SAVED_KEY = 'attendance.participant';
const ID_LENGTH = 10;

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

function idProblem(id) {
  if (id.length === 0) return 'Enter your Employee ID.';
  if (id.length !== ID_LENGTH) return `Employee ID must be exactly ${ID_LENGTH} digits (you entered ${id.length}).`;
  return '';
}

function nameProblem(name) {
  return normalizeName(name).length < 2 ? 'Enter your full name.' : '';
}

export default function AttendPage() {
  const { token } = useParams();
  const [training, setTraining] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ employeeId: '', employeeName: '' });
  const [touched, setTouched] = useState({ employeeId: false, employeeName: false });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
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
        setForm({
          employeeId: /^\d{10}$/.test(p.employeeId || '') ? p.employeeId : '',
          employeeName: p.employeeName || '',
        });
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

  const idError = idProblem(form.employeeId);
  const nameError = nameProblem(form.employeeName);

  function onIdChange(e) {
    // Digits only, max 10 — letters and spaces are dropped as they are typed.
    const digits = e.target.value.replace(/\D/g, '').slice(0, ID_LENGTH);
    setForm({ ...form, employeeId: digits });
    setError('');
  }

  // Step 1: check the details, then show the confirmation screen.
  function review(e) {
    e.preventDefault();
    setTouched({ employeeId: true, employeeName: true });
    setError('');
    if (idError || nameError) return;
    setForm({ ...form, employeeName: normalizeName(form.employeeName) });
    setConfirming(true);
  }

  // Step 2: the participant confirmed — submit.
  async function submit() {
    setError('');
    setBusy(true);
    try {
      const r = await api(`/api/attend/${token}`, { method: 'POST', body: form });
      safeStorage().set(SAVED_KEY, JSON.stringify({ employeeId: r.employeeId, employeeName: r.employeeName }));
      setDone(r);
      setConfirming(false);
    } catch (err) {
      if (err.data?.closed) {
        setTraining(err.data.training);
        setConfirming(false);
      } else {
        setError(err.message);
        // Validation errors send them back to the form to fix; duplicates stay on screen.
        if (err.status === 400) setConfirming(false);
      }
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
            ) : confirming ? (
              <div className="stack">
                <h2>Please check your details</h2>
                <p className="small muted">Attendance can be submitted only once. Make sure these are correct.</p>
                <div className="confirm-box">
                  <div>
                    <div className="confirm-label">Employee ID</div>
                    <div className="confirm-value mono">{form.employeeId}</div>
                  </div>
                  <div>
                    <div className="confirm-label">Full name</div>
                    <div className="confirm-value">{form.employeeName}</div>
                  </div>
                </div>
                <Alert>{error}</Alert>
                <button className="btn btn-primary btn-block btn-lg" onClick={submit} disabled={busy}>
                  {busy ? 'Submitting…' : 'Yes, details are correct — submit'}
                </button>
                <button
                  className="btn btn-block"
                  onClick={() => {
                    setConfirming(false);
                    setError('');
                  }}
                  disabled={busy}
                >
                  Edit details
                </button>
              </div>
            ) : (
              <form className="form" onSubmit={review} noValidate>
                <div className="field">
                  <label htmlFor="employeeId">Employee ID</label>
                  <input
                    id="employeeId"
                    value={form.employeeId}
                    onChange={onIdChange}
                    onBlur={() => setTouched((t) => ({ ...t, employeeId: true }))}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    maxLength={ID_LENGTH}
                    placeholder="10-digit number"
                    aria-invalid={touched.employeeId && Boolean(idError)}
                    aria-describedby="employeeId-help"
                  />
                  <span
                    id="employeeId-help"
                    className={`hint ${touched.employeeId && idError ? 'hint-error' : ''}`}
                  >
                    {touched.employeeId && idError
                      ? idError
                      : `${form.employeeId.length}/${ID_LENGTH} digits`}
                  </span>
                </div>
                <div className="field">
                  <label htmlFor="employeeName">Full name</label>
                  <input
                    id="employeeName"
                    value={form.employeeName}
                    onChange={(e) => {
                      setForm({ ...form, employeeName: e.target.value });
                      setError('');
                    }}
                    onBlur={() => setTouched((t) => ({ ...t, employeeName: true }))}
                    autoComplete="name"
                    maxLength={120}
                    aria-invalid={touched.employeeName && Boolean(nameError)}
                  />
                  {touched.employeeName && nameError && <span className="hint hint-error">{nameError}</span>}
                </div>
                <Alert>{error}</Alert>
                <button className="btn btn-primary btn-block btn-lg">Submit</button>
              </form>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
