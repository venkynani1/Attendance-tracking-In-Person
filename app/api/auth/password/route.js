import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { json, jsonError, readJson, route } from '@/lib/http';
import { requireUser } from '@/lib/auth';

export const POST = route(async (req) => {
  const { user, error } = await requireUser();
  if (error) return error;

  const body = await readJson(req);
  const current = String(body.currentPassword || '');
  const next = String(body.newPassword || '');
  if (next.length < 8) return jsonError(400, 'New password must be at least 8 characters.');
  if (next.length > 128) return jsonError(400, 'New password is too long.');

  const record = await prisma.user.findUnique({ where: { id: user.id } });
  if (!record || !(await bcrypt.compare(current, record.passwordHash))) {
    return jsonError(400, 'Current password is incorrect.');
  }

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  return json({ ok: true });
});
