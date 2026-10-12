import { prisma } from '@/lib/prisma';
import { json, jsonError, route } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { includeCreator, isOpen, loadTrainingForUser, serializeTraining } from '@/lib/trainings';

export const POST = route(async (_req, { params }) => {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const training = await loadTrainingForUser(user, id);
  if (!training) return jsonError(404, 'Training not found.');
  if (!isOpen(training)) return json({ training: serializeTraining(training) });

  const updated = await prisma.training.update({
    where: { id: training.id },
    data: { status: 'STOPPED', stoppedAt: new Date(), stopReason: 'MANUAL' },
    include: { ...includeCreator, _count: { select: { attendance: true, roster: true } } },
  });
  return json({ training: serializeTraining(updated) });
});
