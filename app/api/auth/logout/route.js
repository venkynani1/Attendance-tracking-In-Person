import { json } from '@/lib/http';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/session';

export async function POST() {
  const res = json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 });
  return res;
}
