'use client';

import { useEffect, useState } from 'react';
import { formatDuration } from '@/lib/format';

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function StatusPill({ training, now }) {
  if (!training) return null;
  const open = training.isOpen && (!training.autoCloseAt || new Date(training.autoCloseAt).getTime() > now);
  if (open) {
    const left = training.autoCloseAt ? new Date(training.autoCloseAt).getTime() - now : null;
    return (
      <span className="pill pill-open">
        Open{left != null ? ` · closes in ${formatDuration(left)}` : ''}
      </span>
    );
  }
  return (
    <span className="pill pill-closed">
      {training.stopReason === 'AUTO' ? 'Closed · time ended' : 'Closed'}
    </span>
  );
}

export function Alert({ kind = 'error', children }) {
  if (!children) return null;
  return (
    <div className={`alert alert-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      ✓
    </span>
  );
}
