import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { json, jsonError, readJson, route } from '@/lib/http';
import { publicUser } from '@/lib/auth';
import { SESSION_COOKIE, sessionCookieOptions, signSession } from '@/lib/session';

export const POST = route(async (req) => {
  const body = await readJson(req);
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!username || !password) return jsonError(400, 'Enter your username and password.');

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return jsonError(401, 'Incorrect username or password.');
  }
  if (user.status === 'PENDING') {
    return jsonError(403, 'Your account is waiting for approval from the master admin.');
  }
  if (user.status === 'REJECTED') {
    return jsonError(403, 'Your signup request was not approved. Contact the master admin.');
  }

  const res = json({ user: publicUser(user) });
  res.cookies.set(SESSION_COOKIE, await signSession(user), sessionCookieOptions);
  return res;
});
