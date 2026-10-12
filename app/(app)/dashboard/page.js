'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { Alert, StatusPill, useNow } from '@/components/ui';
import { useUser } from '@/components/user-context';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'closed', label: 'Closed' },
];

function isLiveOpen(t, now) {
  return t.isOpen && (!t.autoCloseAt || new Date(t.autoCloseAt).getTime() > now);
}

export default function DashboardPage() {
  const { user } = useUser();
  const now = useNow(1000);
  const [trainings, setTrainings] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    const load = () =>
      api('/api/trainings')
        .then((d) => alive && (setTrainings(d.trainings), setError('')))
        .catch((err) => alive && setError(err.message));
    load();
    const id = setInterval(load, 20000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const visible = useMemo(() => {
    if (!trainings) return [];
    const q = query.trim().toLowerCase();
    return trainings.filter((t) => {
      const open = isLiveOpen(t, now);
      if (filter === 'open' && !open) return false;
      if (filter === 'closed' && open) return false;
      if (!q) return true;
      return [t.name, t.trainer, t.location, t.dateLabel, t.createdBy].some((v) => v && v.toLowerCase().includes(q));
    });
  }, [trainings, filter, query, now]);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Trainings</h1>
          <p className="muted small">
            {user?.role === 'MASTER' ? 'All trainings across admins' : 'Trainings you created'}
          </p>
        </div>
        <Link href="/trainings/new" className="btn btn-primary">
          + New training
        </Link>
      </div>

      <div className="row">
        <div className="tabs" role="tablist">
          {FILTERS.map((f) => (
            <button key={f.key} role="tab" aria-selected={filter === f.key} className={filter === f.key ? 'active' : ''} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="spacer" />
        <input
          style={{ maxWidth: 280 }}
          placeholder="Search name, trainer, date…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search trainings"
        />
      </div>

      <Alert>{error}</Alert>

      {trainings === null && !error && (
        <div className="training-list">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card">
              <div className="skeleton" style={{ height: 90 }} />
            </div>
          ))}
        </div>
      )}

      {trainings && visible.length === 0 && (
        <div className="card empty">
          {trainings.length === 0 ? (
            <div className="stack" style={{ alignItems: 'center' }}>
              <p>No trainings yet.</p>
              <Link href="/trainings/new" className="btn btn-primary">Create your first training</Link>
            </div>
          ) : (
            <p>No trainings match this filter.</p>
          )}
        </div>
      )}

      {visible.length > 0 && (
        <div className="training-list">
          {visible.map((t) => (
            <Link key={t.id} href={`/trainings/${t.id}`} className="card training-card">
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h2 style={{ flex: 1 }}>{t.name}</h2>
                <StatusPill training={t} now={now} />
              </div>
              <div className="training-meta">
                <span>{t.dateLabel}</span>
                {t.trainer && <span>Trainer: {t.trainer}</span>}
                {t.location && <span>{t.location}</span>}
              </div>
              <div className="row small">
                <strong>{t.presentCount}</strong>
                <span className="muted">present</span>
                {t.rosterCount > 0 && <span className="muted">of {t.rosterCount} on roster</span>}
                {user?.role === 'MASTER' && t.createdBy && (
                  <>
                    <span className="spacer" />
                    <span className="muted">by {t.createdBy}</span>
                  </>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
