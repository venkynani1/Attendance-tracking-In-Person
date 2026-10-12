import { prisma } from '@/lib/prisma';
import { json, jsonError, route } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { loadTrainingForUser, serializeTraining } from '@/lib/trainings';

export const dynamic = 'force-dynamic';

export const GET = route(async (_req, { params }) => {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const training = await loadTrainingForUser(user, id);
  if (!training) return jsonError(404, 'Training not found.');
  return json({ training: serializeTraining(training) });
});

export const DELETE = route(async (_req, { params }) => {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const training = await loadTrainingForUser(user, id);
  if (!training) return jsonError(404, 'Training not found.');
  await prisma.training.delete({ where: { id: training.id } });
  return json({ ok: true });
});
