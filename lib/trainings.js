import crypto from 'node:crypto';
import { prisma } from './prisma';
import { formatTrainingDate } from './format';

export function newToken() {
  return crypto.randomBytes(9).toString('base64url'); // 12 URL-safe characters
}

export function isOpen(training, now = new Date()) {
  if (training.status !== 'ACTIVE') return false;
  return !training.autoCloseAt || new Date(training.autoCloseAt) > now;
}

// If the time window has passed, record the training as closed (done lazily on read).
export async function syncStatus(training) {
  if (training.status === 'ACTIVE' && training.autoCloseAt && new Date(training.autoCloseAt) <= new Date()) {
    const updated = await prisma.training.update({
      where: { id: training.id },
      data: { status: 'STOPPED', stoppedAt: training.autoCloseAt, stopReason: 'AUTO' },
    });
    return { ...training, ...updated };
  }
  return training;
}

export function canAccess(user, training) {
  return user.role === 'MASTER' || training.createdById === user.id;
}

const includeCreator = { createdBy: { select: { username: true, displayName: true } } };

export async function loadTrainingForUser(user, id) {
  const training = await prisma.training.findUnique({
    where: { id: String(id) },
    include: { ...includeCreator, _count: { select: { attendance: true, roster: true } } },
  });
  if (!training || !canAccess(user, training)) return null;
  return syncStatus(training);
}

export function serializeTraining(t) {
  return {
    id: t.id,
    name: t.name,
    trainer: t.trainer,
    location: t.location,
    date: t.date,
    dateLabel: formatTrainingDate(t.date),
    token: t.token,
    status: t.status,
    isOpen: isOpen(t),
    autoCloseAt: t.autoCloseAt,
    stoppedAt: t.stoppedAt,
    stopReason: t.stopReason,
    createdAt: t.createdAt,
    createdBy: t.createdBy ? t.createdBy.displayName || t.createdBy.username : undefined,
    requireLocation: Boolean(t.requireLocation),
    venueSet: t.venueLat != null && t.venueLng != null,
    venueLat: t.venueLat,
    venueLng: t.venueLng,
    venueAccuracy: t.venueAccuracy,
    radiusMeters: t.radiusMeters ?? 150,
    presentCount: t._count?.attendance,
    rosterCount: t._count?.roster,
  };
}

export function parseDurationMinutes(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 24 * 60) return null;
  return n;
}

export function autoCloseFrom(minutes) {
  return minutes > 0 ? new Date(Date.now() + minutes * 60 * 1000) : null;
}

export { includeCreator };
