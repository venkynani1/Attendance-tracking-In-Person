import crypto from 'node:crypto';

// A random ID kept on the participant's phone (httpOnly cookie, plus a local-storage copy
// sent with the form). One attendance submission is allowed per phone per training.
export const DEVICE_COOKIE = 'att_dev';

export const deviceCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 400, // ~13 months (browser maximum)
};

const VALID_ID = /^[A-Za-z0-9_-]{16,64}$/;

export function cleanDeviceId(value) {
  const s = String(value || '');
  return VALID_ID.test(s) ? s : null;
}

export function newDeviceId() {
  return crypto.randomBytes(16).toString('base64url');
}

// Network address + browser signature, hashed. Not used to block anyone (people on the
// same office Wi-Fi with the same phone model share it); only to flag entries for review.
export function deviceHash(req) {
  const ip =
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || '';
  const ua = req.headers.get('user-agent') || '';
  return crypto.createHash('sha256').update(`${ip}|${ua}`).digest('hex').slice(0, 16);
}
