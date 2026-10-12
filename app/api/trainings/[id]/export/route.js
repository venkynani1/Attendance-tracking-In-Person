import { prisma } from '@/lib/prisma';
import { jsonError, route } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { loadTrainingForUser } from '@/lib/trainings';
import { buildAttendanceWorkbook, exportFileName } from '@/lib/export';

export const runtime = 'nodejs';
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

  const buffer = await buildAttendanceWorkbook(training, attendance, roster);
  const fileName = exportFileName(training);
  const asciiName = fileName.replace(/[^\x20-\x7e]/g, '_');

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'Cache-Control': 'no-store',
    },
  });
});
