import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { isUniqueViolation, json, jsonError, readJson, route } from '@/lib/http';
import { cleanDisplayName, validateCredentials } from '@/lib/auth';

export const POST = route(async (req) => {
  const body = await readJson(req);
  const creds = validateCredentials(body.username, body.password);
  if (creds.error) return jsonError(400, creds.error);

  try {
    await prisma.user.create({
      data: {
        username: creds.username,
        displayName: cleanDisplayName(body.displayName),
        passwordHash: await bcrypt.hash(body.password, 10),
        role: 'ADMIN',
        status: 'PENDING',
      },
    });
  } catch (err) {
    if (isUniqueViolation(err)) return jsonError(409, 'That username is already taken.');
    throw err;
  }

  return json({ ok: true, message: 'Request sent. You can log in once the master admin approves it.' }, 201);
});
