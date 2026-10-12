// Public endpoints used by participants after scanning the QR code.
import { prisma } from '@/lib/prisma';
import { isUniqueViolation, json, jsonError, readJson, route } from '@/lib/http';
import { formatTrainingDate, normalizeEmployeeId, normalizeName } from '@/lib/format';
import { isOpen, syncStatus } from '@/lib/trainings';

export const dynamic = 'force-dynamic';

async function findByToken(token) {
  const training = await prisma.training.findUnique({ where: { token: String(token || '') } });
  return training ? syncStatus(training) : null;
}

function publicTraining(t) {
  return {
    name: t.name,
    trainer: t.trainer,
    location: t.location,
    dateLabel: formatTrainingDate(t.date),
    isOpen: isOpen(t),
    closedReason: isOpen(t) ? null : t.stopReason || 'MANUAL',
    autoCloseAt: t.autoCloseAt,
  };
}

export const GET = route(async (_req, { params }) => {
  const { token } = await params;
  const training = await findByToken(token);
  if (!training) return jsonError(404, 'This attendance link is not valid. Please scan the QR code again.');
  return json({ training: publicTraining(training) });
});

export const POST = route(async (req, { params }) => {
  const { token } = await params;
  const training = await findByToken(token);
  if (!training) return jsonError(404, 'This attendance link is not valid. Please scan the QR code again.');
  if (!isOpen(training)) {
    return jsonError(409, 'Attendance for this training is closed.', { closed: true, training: publicTraining(training) });
  }

  const body = await readJson(req);
  const employeeId = normalizeEmployeeId(body.employeeId);
  const employeeName = normalizeName(body.employeeName);
  if (!/^[A-Z0-9._/-]{2,40}$/.test(employeeId)) {
    return jsonError(400, 'Enter a valid Employee ID (letters and numbers only).');
  }
  if (employeeName.length < 2 || employeeName.length > 120) {
    return jsonError(400, 'Enter your full name.');
  }

  try {
    const record = await prisma.attendance.create({
      data: { trainingId: training.id, employeeId, employeeName },
    });
    return json({ ok: true, employeeId, employeeName, submittedAt: record.submittedAt }, 201);
  } catch (err) {
    if (isUniqueViolation(err)) {
      return jsonError(409, `Employee ID ${employeeId} is already marked present for this training.`, {
        duplicate: true,
      });
    }
    throw err;
  }
});
