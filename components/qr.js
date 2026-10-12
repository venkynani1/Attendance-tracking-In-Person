'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

// The QR always points at the address this page was opened from (e.g. your-app.vercel.app),
// so it can never accidentally encode localhost on the live site.
export function useAttendUrl(token) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (token) setUrl(`${window.location.origin}/attend/${token}`);
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
