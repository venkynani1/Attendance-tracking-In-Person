import { prisma } from '@/lib/prisma';
import { json, jsonError, readJson, route } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import {
  autoCloseFrom,
  includeCreator,
  loadTrainingForUser,
  parseDurationMinutes,
  serializeTraining,
} from '@/lib/trainings';

export const POST = route(async (req, { params }) => {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const training = await loadTrainingForUser(user, id);
  if (!training) return jsonError(404, 'Training not found.');

  const body = await readJson(req);
  const duration = parseDurationMinutes(body.durationMinutes ?? 30);
  if (duration === null) return jsonError(400, 'Choose how long attendance should stay open.');

  const updated = await prisma.training.update({
    where: { id: training.id },
    data: { status: 'ACTIVE', autoCloseAt: autoCloseFrom(duration), stoppedAt: null, stopReason: null },
    include: { ...includeCreator, _count: { select: { attendance: true, roster: true } } },
  });
  return json({ training: serializeTraining(updated) });
});
