import { prisma } from '@/lib/prisma';
import { json, jsonError, readJson, route } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { isValidISODate, normalizeName } from '@/lib/format';
import {
  autoCloseFrom,
  includeCreator,
  newToken,
  parseDurationMinutes,
  serializeTraining,
  syncStatus,
} from '@/lib/trainings';

export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  const { user, error } = await requireUser();
  if (error) return error;

  const trainings = await prisma.training.findMany({
    where: user.role === 'MASTER' ? {} : { createdById: user.id },
    include: { ...includeCreator, _count: { select: { attendance: true, roster: true } } },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  const synced = await Promise.all(trainings.map(syncStatus));
  return json({ trainings: synced.map(serializeTraining) });
});

export const POST = route(async (req) => {
  const { user, error } = await requireUser();
  if (error) return error;

  const body = await readJson(req);
  const name = normalizeName(body.name);
  const trainer = normalizeName(body.trainer) || null;
  const location = normalizeName(body.location) || null;
  const date = String(body.date || '');
  const duration = parseDurationMinutes(body.durationMinutes ?? 60);

  if (name.length < 2 || name.length > 120) return jsonError(400, 'Training name must be 2–120 characters.');
  if (!isValidISODate(date)) return jsonError(400, 'Choose a valid training date.');
  if (duration === null) return jsonError(400, 'Choose how long attendance should stay open.');
  if (trainer && trainer.length > 120) return jsonError(400, 'Trainer name is too long.');
  if (location && location.length > 120) return jsonError(400, 'Location is too long.');

  const training = await prisma.training.create({
    data: {
      name,
      trainer,
      location,
      date,
      token: newToken(),
      status: 'ACTIVE',
      autoCloseAt: autoCloseFrom(duration),
      createdById: user.id,
    },
    include: { ...includeCreator, _count: { select: { attendance: true, roster: true } } },
  });

  return json({ training: serializeTraining(training) }, 201);
});
