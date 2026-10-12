'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

// Public base address for participant links.
// Priority: NEXT_PUBLIC_APP_URL (e.g. a custom domain) → the project's production domain
// (set automatically by Vercel) → the address this page was opened from.
// Using the production domain matters: Vercel puts a login wall ("Vercel Authentication")
// on deployment-specific URLs, but not on the production domain.
function publicBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  const production = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;
  if (production) return `https://${production.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
  return window.location.origin;
}

export function useAttendUrl(token) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (token) setUrl(`${publicBaseUrl()}/attend/${token}`);
  }, [token]);
  return url;
}

export function useQrDataUrl(text, width = 600) {
  const [dataUrl, setDataUrl] = useState('');
  useEffect(() => {
    if (!text) return;
    let alive = true;
    QRCode.toDataURL(text, { width, margin: 1, errorCorrectionLevel: 'M' })
      .then((d) => alive && setDataUrl(d))
      .catch(() => alive && setDataUrl(''));
    return () => {
      alive = false;
    };
  }, [text, width]);
  return dataUrl;
}

export function isLocalUrl(url) {
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host.endsWith('.local');
  } catch {
    return false;
  }
}
