'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { DURATION_OPTIONS, formatTime } from '@/lib/format';
import { Alert, StatusPill, useNow } from '@/components/ui';
import { isLocalUrl, useAttendUrl, useQrDataUrl } from '@/components/qr';

export default function TrainingPage() {
  const { id } = useParams();
  const router = useRouter();
  const now = useNow(1000);

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [reopenMinutes, setReopenMinutes] = useState(30);
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const d = await api(`/api/trainings/${id}/attendance`);
      setData(d);
      setLoadError('');
    } catch (err) {
      setLoadError(err.message);
    }
  }, [id]);

  const training = data?.training;
  const liveOpen = Boolean(
    training?.isOpen && (!training.autoCloseAt || new Date(training.autoCloseAt).getTime() > now)
  );

  useEffect(() => {
    load();
  }, [load]);

  // Refresh every 5 s while attendance is open, every 30 s otherwise.
  useEffect(() => {
    if (!data) return;
    if (!liveOpen && training?.isOpen) load(); // window just ended: pick up the closed state
    const t = setInterval(load, liveOpen ? 5000 : 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveOpen, load, Boolean(data)]);

  const attendUrl = useAttendUrl(training?.token);
  const qr = useQrDataUrl(attendUrl, 640);

  const filtered = useMemo(() => {
    const list = data?.present || [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => p.employeeId.toLowerCase().includes(q) || p.employeeName.toLowerCase().includes(q));
  }, [data, query]);

  async function run(label, fn, successMessage) {
    setActionError('');
    setNotice('');
    setBusy(label);
    try {
      await fn();
      if (successMessage) setNotice(successMessage);
      await load();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy('');
    }
  }

  const stop = () => {
    if (!window.confirm('Stop attendance now? Participants will see that attendance was closed.')) return;
    run('stop', () => api(`/api/trainings/${id}/stop`, { method: 'POST' }));
  };

  const reopen = () =>
    run('reopen', () => api(`/api/trainings/${id}/reopen`, { method: 'POST', body: { durationMinutes: Number(reopenMinutes) } }));

  const remove = async () => {
    if (!window.confirm(`Delete "${training.name}" and all its attendance records? This cannot be undone.`)) return;
    setBusy('delete');
    try {
      await api(`/api/trainings/${id}`, { method: 'DELETE' });
      router.push('/dashboard');
    } catch (err) {
      setActionError(err.message);
      setBusy('');
    }
  };

  const uploadRoster = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    run(
      'roster',
      async () => {
        const r = await api(`/api/trainings/${id}/roster`, { method: 'POST', form });
        setNotice(`Roster uploaded: ${r.count} employees.`);
      }
    );
  };

  const removeEntry = (p) => {
    if (!window.confirm(`Remove ${p.employeeName} (${p.employeeId}) from this training's attendance?`)) return;
    run(
      `remove-${p.employeeId}`,
      () => api(`/api/trainings/${id}/attendance`, { method: 'DELETE', body: { employeeId: p.employeeId } }),
      `Removed ${p.employeeName}.`
    );
  };

  const clearRoster = () => {
    if (!window.confirm('Remove the roster? Attendance records are kept.')) return;
    run('roster', () => api(`/api/trainings/${id}/roster`, { method: 'DELETE' }), 'Roster removed.');
  };

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(attendUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked; the link is visible to copy by hand */
    }
  }

  if (loadError && !data) {
    return (
      <div className="stack">
        <Link href="/dashboard" className="small">← Trainings</Link>
        <Alert>{loadError}</Alert>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid-2">
        <div className="card"><div className="skeleton" style={{ height: 360 }} /></div>
        <div className="card"><div className="skeleton" style={{ height: 360 }} /></div>
      </div>
    );
  }

  const rosterCount = training.rosterCount || 0;
  const presentCount = data.present.length;

  return (
    <div className="stack">
      <div>
        <Link href="/dashboard" className="small">← Trainings</Link>
        <div className="page-head" style={{ marginTop: 6, marginBottom: 0 }}>
          <div>
            <div className="row">
              <h1>{training.name}</h1>
              <StatusPill training={training} now={now} />
            </div>
            <p className="muted small" style={{ marginTop: 4 }}>
              {training.dateLabel}
              {training.trainer ? ` · Trainer: ${training.trainer}` : ''}
              {training.location ? ` · ${training.location}` : ''}
              {training.createdBy ? ` · Created by ${training.createdBy}` : ''}
            </p>
          </div>
          <a className="btn btn-primary" href={`/api/trainings/${id}/export`}>
            Export Excel
          </a>
        </div>
      </div>

      <Alert>{actionError}</Alert>
      <Alert kind="ok">{notice}</Alert>
      {loadError && <Alert kind="warn">{`Live refresh paused: ${loadError}`}</Alert>}

      <div className="grid-2">
        {/* Left column: QR + controls */}
        <div className="stack">
          <section className="card stack">
            <div className="card-head" style={{ marginBottom: 0 }}>
              <h2>Scan to mark attendance</h2>
            </div>
            {attendUrl && isLocalUrl(attendUrl) && (
              <Alert kind="warn">
                You opened this page on localhost, so this QR only works on this computer. Open the deployed site (your Vercel URL) to get a QR that works on phones.
              </Alert>
            )}
            <div className="qr-box">
              {qr ? <img src={qr} alt="QR code for the attendance link" /> : <div className="skeleton" style={{ width: 260, height: 260 }} />}
            </div>
            <div className="link-box">
              <input readOnly value={attendUrl} aria-label="Attendance link" onFocus={(e) => e.target.select()} />
              <button className="btn btn-sm" onClick={copyLink}>{copied ? 'Copied' : 'Copy'}</button>
            </div>
            <div className="row">
              <Link className="btn btn-sm" href={`/present/${id}`} target="_blank">
                Show on projector
              </Link>
              {qr && (
                <a className="btn btn-sm" href={qr} download={`QR_${training.name.replace(/[^\w-]+/g, '_')}.png`}>
                  Download QR
                </a>
              )}
            </div>
          </section>

          <section className="card stack">
            <h2>Attendance window</h2>
            {liveOpen ? (
              <>
                <p className="small muted">
                  {training.autoCloseAt
                    ? `Closes automatically at ${formatTime(training.autoCloseAt)}.`
                    : 'Stays open until you stop it.'}
                </p>
                <button className="btn btn-solid-danger" onClick={stop} disabled={busy === 'stop'}>
                  {busy === 'stop' ? 'Stopping…' : 'Stop attendance now'}
                </button>
              </>
            ) : (
              <>
                <p className="small muted">
                  {training.stopReason === 'AUTO' ? 'The time window ended' : 'Stopped by admin'}
                  {training.stoppedAt ? ` at ${formatTime(training.stoppedAt)}` : ''}.
                </p>
                <div className="row">
                  <select value={reopenMinutes} onChange={(e) => setReopenMinutes(e.target.value)} style={{ flex: 1 }} aria-label="Reopen for">
                    {DURATION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <button className="btn btn-primary" onClick={reopen} disabled={busy === 'reopen'}>
                    {busy === 'reopen' ? 'Reopening…' : 'Reopen'}
                  </button>
                </div>
              </>
            )}
          </section>

          <section className="card stack">
            <div className="card-head" style={{ marginBottom: 0 }}>
              <h2>Roster (optional)</h2>
              {rosterCount > 0 && <span className="pill pill-info">{rosterCount} employees</span>}
            </div>
            <p className="small muted">
              Upload the expected participants (Excel or CSV: Employee ID, Employee Name). People on the roster who don&apos;t scan are exported as Absent.
            </p>
            <input ref={fileRef} type="file" accept=".xlsx,.csv" onChange={uploadRoster} hidden />
            <div className="row">
              <button className="btn btn-sm" onClick={() => fileRef.current?.click()} disabled={busy === 'roster'}>
                {busy === 'roster' ? 'Uploading…' : rosterCount > 0 ? 'Replace roster' : 'Upload roster'}
              </button>
              {rosterCount > 0 && (
                <button className="btn btn-sm btn-ghost" onClick={clearRoster} disabled={busy === 'roster'}>
                  Remove
                </button>
              )}
            </div>
          </section>

          <button className="btn btn-danger" onClick={remove} disabled={busy === 'delete'}>
            {busy === 'delete' ? 'Deleting…' : 'Delete training'}
          </button>
        </div>

        {/* Right column: live attendance */}
        <div className="stack">
          <div className="stats">
            <div className="stat">
              <div className="stat-value">{presentCount}</div>
              <div className="stat-label">Present</div>
            </div>
            <div className="stat">
              <div className="stat-value">{rosterCount > 0 ? data.absent.length : '—'}</div>
              <div className="stat-label">Absent (from roster)</div>
            </div>
            <div className="stat">
              <div className="stat-value">{data.present.filter((p) => p.possibleSameDevice).length}</div>
              <div className="stat-label">Flagged: possible same phone</div>
            </div>
          </div>

          <section className="card">
            <div className="card-head">
              <h2>Present ({presentCount})</h2>
              <input style={{ maxWidth: 220 }} placeholder="Search ID or name" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search attendees" />
            </div>
            {presentCount === 0 ? (
              <p className="empty">{liveOpen ? 'Waiting for the first scan…' : 'Nobody marked attendance.'}</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Employee ID</th>
                      <th>Name</th>
                      <th>Time</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, i) => (
                      <tr key={p.employeeId}>
                        <td className="num">{i + 1}</td>
                        <td className="mono">{p.employeeId}</td>
                        <td>
                          {p.employeeName}{' '}
                          {p.inRoster === false && <span className="pill pill-warn">Not on roster</span>}{' '}
                          {p.possibleSameDevice && (
                            <span
                              className="pill pill-danger"
                              title="Submitted from the same network and phone/browser type as another entry. Could be one phone used twice (e.g. a private tab), or two people with the same phone model on office Wi-Fi."
                            >
                              Possible same phone
                            </span>
                          )}
                        </td>
                        <td className="muted">{formatTime(p.submittedAt)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => removeEntry(p)}
                            disabled={busy === `remove-${p.employeeId}`}
                            aria-label={`Remove ${p.employeeName}`}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {rosterCount > 0 && data.absent.length > 0 && (
            <section className="card">
              <div className="card-head">
                <h2>Not yet marked ({data.absent.length})</h2>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Employee ID</th>
                      <th>Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.absent.map((a) => (
                      <tr key={a.employeeId}>
                        <td className="mono">{a.employeeId}</td>
                        <td>{a.employeeName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
