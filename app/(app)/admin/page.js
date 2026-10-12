'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Alert } from '@/components/ui';
import { useUser } from '@/components/user-context';

const STATUS_PILL = { APPROVED: 'pill-open', PENDING: 'pill-warn', REJECTED: 'pill-closed' };

export default function AdminPage() {
  const { user, refresh } = useUser();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(() => {
    api('/api/admin/users')
      .then((d) => {
        setUsers(d.users);
        setError('');
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id, action) {
    setBusyId(id);
    setError('');
    try {
      await api(`/api/admin/users/${id}`, { method: 'PATCH', body: { action } });
      load();
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  }

  if (user && user.role !== 'MASTER') {
    return <Alert>Only the master admin can manage approvals.</Alert>;
  }

  const pending = (users || []).filter((u) => u.status === 'PENDING');
  const others = (users || []).filter((u) => u.status !== 'PENDING');

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Admin approvals</h1>
          <p className="muted small">New signups can sign in only after you approve them.</p>
        </div>
      </div>

      <Alert>{error}</Alert>

      <section className="card">
        <div className="card-head">
          <h2>Waiting for approval ({pending.length})</h2>
        </div>
        {users === null ? (
          <div className="skeleton" style={{ height: 60 }} />
        ) : pending.length === 0 ? (
          <p className="muted small">No pending requests.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Requested</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pending.map((u) => (
                  <tr key={u.id}>
                    <td>{u.displayName || '—'}</td>
                    <td className="mono">{u.username}</td>
                    <td className="muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="row" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-sm btn-primary" disabled={busyId === u.id} onClick={() => act(u.id, 'approve')}>
                          Approve
                        </button>
                        <button className="btn btn-sm btn-danger" disabled={busyId === u.id} onClick={() => act(u.id, 'reject')}>
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>All admins</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {others.map((u) => (
                <tr key={u.id}>
                  <td>{u.displayName || '—'}</td>
                  <td className="mono">{u.username}</td>
                  <td>{u.role === 'MASTER' ? 'Master' : 'Admin'}</td>
                  <td>
                    <span className={`pill ${STATUS_PILL[u.status]}`}>{u.status.toLowerCase()}</span>
                  </td>
                  <td>
                    {u.role !== 'MASTER' && (
                      <div className="row" style={{ justifyContent: 'flex-end' }}>
                        {u.status === 'APPROVED' ? (
                          <button className="btn btn-sm btn-danger" disabled={busyId === u.id} onClick={() => act(u.id, 'reject')}>
                            Revoke access
                          </button>
                        ) : (
                          <button className="btn btn-sm" disabled={busyId === u.id} onClick={() => act(u.id, 'approve')}>
                            Approve
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
