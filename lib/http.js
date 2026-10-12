import { NextResponse } from 'next/server';

export function json(data, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function jsonError(status, message, extra = {}) {
  return NextResponse.json({ error: message, ...extra }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function readJson(req) {
  try {
    const body = await req.json();
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
}

// Wraps a route handler so unexpected errors return a clean JSON 500 instead of an HTML page.
export function route(handler) {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      console.error('[api error]', err);
      const message = String(err?.message || '').includes('JWT_SECRET')
        ? 'Server is not configured: JWT_SECRET is missing.'
        : 'Something went wrong on the server. Please try again.';
      return jsonError(500, message);
    }
  };
}

export function isUniqueViolation(err) {
  return err?.code === 'P2002';
}
