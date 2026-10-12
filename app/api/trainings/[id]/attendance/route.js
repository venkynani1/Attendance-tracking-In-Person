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

  const [attendance, roster] = await Promise.all([
    prisma.attendance.findMany({ where: { trainingId: training.id }, orderBy: { submittedAt: 'asc' } }),
    prisma.rosterEntry.findMany({ where: { trainingId: training.id }, orderBy: { position: 'asc' } }),
  ]);

  const rosterIds = new Set(roster.map((r) => r.employeeId));
  const presentIds = new Set(attendance.map((a) => a.employeeId));

  const present = attendance.map((a) => ({
    employeeId: a.employeeId,
    employeeName: a.employeeName,
    submittedAt: a.submittedAt,
    inRoster: roster.length === 0 ? null : rosterIds.has(a.employeeId),
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
