'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { formatDuration } from '@/lib/format';
import { useNow } from '@/components/ui';
import { useAttendUrl, useQrDataUrl } from '@/components/qr';

// Full-screen view for a projector or TV in the training room.
export default function PresentPage() {
  const { id } = useParams();
  const now = useNow(1000);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api(`/api/trainings/${id}`)
      .then((d) => {
        setData(d.training);
        setError('');
      })
      .catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const url = useAttendUrl(data?.token);
  const qr = useQrDataUrl(url, 900);

  if (error && !data) {
    return (
      <main className="present">
        <p>{error}</p>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="present">
        <div className="skeleton" style={{ width: 320, height: 320 }} />
      </main>
    );
  }

  const open = data.isOpen && (!data.autoCloseAt || new Date(data.autoCloseAt).getTime() > now);
  const left = open && data.autoCloseAt ? new Date(data.autoCloseAt).getTime() - now : null;

  return (
    <main className="present">
      <div>
        <h1>{data.name}</h1>
        <p className="muted" style={{ fontSize: '1.1rem', marginTop: 6 }}>
          {data.dateLabel}
          {data.trainer ? ` · ${data.trainer}` : ''}
        </p>
      </div>

      {open ? (
        <>
          <div className="qr-box">{qr && <img src={qr} alt="Scan to mark attendance" />}</div>
          <p className="present-url">{url}</p>
          <div className="row" style={{ justifyContent: 'center', gap: 16 }}>
            <span className="present-count">{data.presentCount} present</span>
            {left != null && <span className="pill pill-open" style={{ fontSize: '1rem' }}>closes in {formatDuration(left)}</span>}
          </div>
        </>
      ) : (
        <>
          <div className="big-icon closed">■</div>
          <h2 style={{ fontSize: '1.8rem' }}>Attendance is closed</h2>
          <p className="present-count">{data.presentCount} present</p>
        </>
      )}
    </main>
  );
}
