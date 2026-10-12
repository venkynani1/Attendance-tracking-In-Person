'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { DURATION_OPTIONS, todayISO } from '@/lib/format';
import { Alert } from '@/components/ui';

export default function NewTrainingPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', trainer: '', location: '', date: '', durationMinutes: 60 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Set today's date on the client so it uses the admin's local time zone.
  useEffect(() => {
    setForm((f) => (f.date ? f : { ...f, date: todayISO() }));
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { training } = await api('/api/trainings', {
        method: 'POST',
        body: { ...form, durationMinutes: Number(form.durationMinutes) },
      });
      router.push(`/trainings/${training.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <div>
        <Link href="/dashboard" className="small">← Trainings</Link>
        <h1 style={{ marginTop: 6 }}>New training</h1>
        <p className="muted small">Attendance opens as soon as you create it. You can stop or reopen it anytime.</p>
      </div>

      <form className="card form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="name">Training name *</label>
          <input id="name" value={form.name} onChange={set('name')} required maxLength={120} placeholder="e.g. Advanced Excel – Batch 3" />
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="date">Training date *</label>
            <input id="date" type="date" value={form.date} onChange={set('date')} required />
            <span className="hint">Used as the date column in the Excel export</span>
          </div>
          <div className="field">
            <label htmlFor="duration">Keep attendance open for</label>
            <select id="duration" value={form.durationMinutes} onChange={set('durationMinutes')}>
              {DURATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="trainer">Trainer</label>
            <input id="trainer" value={form.trainer} onChange={set('trainer')} maxLength={120} />
          </div>
          <div className="field">
            <label htmlFor="location">Location / room</label>
            <input id="location" value={form.location} onChange={set('location')} maxLength={120} />
          </div>
        </div>
        <Alert>{error}</Alert>
        <div className="row">
          <button className="btn btn-primary" disabled={busy || !form.date}>
            {busy ? 'Creating…' : 'Create & open attendance'}
          </button>
          <Link href="/dashboard" className="btn btn-ghost">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
