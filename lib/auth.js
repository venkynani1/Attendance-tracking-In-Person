import { cookies } from 'next/headers';
import { prisma } from './prisma';
import { SESSION_COOKIE, verifySession } from './session';
import { jsonError } from './http';

const userSelect = { id: true, username: true, displayName: true, role: true, status: true, createdAt: true };

export async function getCurrentUser() {
  const store = await cookies();
  const payload = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!payload?.sub) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: userSelect });
  // Re-checking status means a rejected admin loses access immediately.
  if (!user || user.status !== 'APPROVED') return null;
  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) return { error: jsonError(401, 'Your session has ended. Please log in again.') };
  return { user };
}

export async function requireMaster() {
  const result = await requireUser();
  if (result.error) return result;
  if (result.user.role !== 'MASTER') {
    return { error: jsonError(403, 'Only the master admin can do this.') };
  }
  return result;
}

export function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  };
}

const USERNAME_RE = /^[a-z0-9@._-]{3,40}$/;

export function validateCredentials(username, password) {
  const u = String(username || '').trim().toLowerCase();
  if (!USERNAME_RE.test(u)) {
    return { error: 'Username must be 3–40 characters: letters, numbers, @ . _ -' };
  }
  if (typeof password !== 'string' || password.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }
  if (password.length > 128) {
    return { error: 'Password is too long.' };
  }
  return { username: u };
}

export function cleanDisplayName(value) {
  const v = String(value || '').trim().replace(/\s+/g, ' ');
  return v ? v.slice(0, 80) : null;
}
