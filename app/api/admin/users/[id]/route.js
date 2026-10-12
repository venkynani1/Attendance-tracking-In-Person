import { prisma } from '@/lib/prisma';
import { json, jsonError, readJson, route } from '@/lib/http';
import { publicUser, requireMaster } from '@/lib/auth';

const ACTIONS = { approve: 'APPROVED', reject: 'REJECTED' };

export const PATCH = route(async (req, { params }) => {
  const { error } = await requireMaster();
  if (error) return error;
  const { id } = await params;
  const body = await readJson(req);
  const status = ACTIONS[body.action];
  if (!status) return jsonError(400, 'Unknown action.');

  const target = await prisma.user.findUnique({ where: { id: String(id) } });
  if (!target) return jsonError(404, 'User not found.');
  if (target.role === 'MASTER') return jsonError(400, 'The master admin account cannot be changed here.');

  const updated = await prisma.user.update({ where: { id: target.id }, data: { status } });
  return json({ user: publicUser(updated) });
});
