import { prisma } from '@/lib/prisma';
import { json, jsonError, readJson, route } from '@/lib/http';
import { normalizeEmployeeId } from '@/lib/format';
import { requireUser } from '@/lib/auth';
import { loadTrainingForUser, serializeTraining } from '@/lib/trainings';

export const dynamic = 'force-dynamic';

export const GET = route(async (_req, { params }) => {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const training = await loadTrainingForUser(user, id);
  if (!training) return jsonError(404, 'Training not found.');

  const [attendance, roster] = await Promise.all([
    prisma.attendance.findMany({ where: { trainingId: training.id }, orderBy: { submittedAt: 'asc' } }),
    prisma.rosterEntry.findMany({ where: { trainingId: training.id }, orderBy: { position: 'asc' } }),
  ]);

  const rosterIds = new Set(roster.map((r) => r.employeeId));
  const presentIds = new Set(attendance.map((a) => a.employeeId));

  // Entries sharing the same network + browser signature may come from one phone
  // (e.g. a second submission from a private/incognito tab). Flag them for review.
  const hashCounts = new Map();
  for (const a of attendance) {
    if (a.deviceHash) hashCounts.set(a.deviceHash, (hashCounts.get(a.deviceHash) || 0) + 1);
  }

  const present = attendance.map((a) => ({
    employeeId: a.employeeId,
    employeeName: a.employeeName,
    submittedAt: a.submittedAt,
    inRoster: roster.length === 0 ? null : rosterIds.has(a.employeeId),
    possibleSameDevice: Boolean(a.deviceHash && hashCounts.get(a.deviceHash) > 1),
    distanceMeters: a.distanceMeters,
    locationAccuracy: a.locationAccuracy,
  }));
  const absent = roster
    .filter((r) => !presentIds.has(r.employeeId))
    .map((r) => ({ employeeId: r.employeeId, employeeName: r.employeeName }));

  return json({
    training: serializeTraining({ ...training, _count: { attendance: attendance.length, roster: roster.length } }),
    present,
    absent,
  });
});

// Remove one attendance entry (e.g. someone marked present who was not in the room).
export const DELETE = route(async (req, { params }) => {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const training = await loadTrainingForUser(user, id);
  if (!training) return jsonError(404, 'Training not found.');

  const body = await readJson(req);
  const employeeId = normalizeEmployeeId(body.employeeId);
  if (!employeeId) return jsonError(400, 'Employee ID is required.');

  const result = await prisma.attendance.deleteMany({ where: { trainingId: training.id, employeeId } });
  if (result.count === 0) return jsonError(404, 'That entry was already removed.');
  return json({ ok: true });
});
