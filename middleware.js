import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from './lib/session';

export async function middleware(req) {
  const payload = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!payload) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/trainings/:path*', '/admin/:path*', '/account/:path*', '/present/:path*'],
};
