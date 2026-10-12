import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { json, jsonError, readJson, route } from '@/lib/http';
import { cleanDisplayName, publicUser, validateCredentials } from '@/lib/auth';
import { SESSION_COOKIE, sessionCookieOptions, signSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  const masters = await prisma.user.count({ where: { role: 'MASTER' } });
  return json({ needsSetup: masters === 0, setupKeyConfigured: Boolean(process.env.SETUP_KEY) });
});

function keysMatch(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export const POST = route(async (req) => {
  const body = await readJson(req);
  if (!process.env.SETUP_KEY) return jsonError(500, 'SETUP_KEY is not set in the server environment.');
  if (!keysMatch(body.setupKey, process.env.SETUP_KEY)) return jsonError(403, 'Setup key is incorrect.');

  const existing = await prisma.user.count({ where: { role: 'MASTER' } });
  if (existing > 0) return jsonError(409, 'A master admin already exists. Please log in.');

  const creds = validateCredentials(body.username, body.password);
  if (creds.error) return jsonError(400, creds.error);

  const user = await prisma.user.create({
    data: {
      username: creds.username,
      displayName: cleanDisplayName(body.displayName),
      passwordHash: await bcrypt.hash(body.password, 10),
      role: 'MASTER',
      status: 'APPROVED',
    },
  });

  const res = json({ user: publicUser(user) }, 201);
  res.cookies.set(SESSION_COOKIE, await signSession(user), sessionCookieOptions);
  return res;
});
