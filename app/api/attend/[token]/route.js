// Public endpoints used by participants after scanning the QR code.
import { prisma } from '@/lib/prisma';
import { isUniqueViolation, json, jsonError, readJson, route } from '@/lib/http';
import { formatTrainingDate, normalizeEmployeeId, normalizeName } from '@/lib/format';
import { isOpen, syncStatus } from '@/lib/trainings';
import { cleanDeviceId, DEVICE_COOKIE, deviceCookieOptions, deviceHash, newDeviceId } from '@/lib/device';
import { cleanAccuracy, cleanCoords, distanceMeters, formatDistance, isWithinVenue } from '@/lib/geo';

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
    // Only whether a check is needed — the venue coordinates are never sent to phones.
    requireLocation: Boolean(t.requireLocation && t.venueLat != null && t.venueLng != null),
  };
}

// Returns { error } if the phone is not at the venue, or { distance, accuracy } if it is.
function checkLocation(training, body) {
  if (!training.requireLocation || training.venueLat == null || training.venueLng == null) return {};
  const coords = cleanCoords(body.location?.lat, body.location?.lng);
  if (!coords) {
    return {
      error: jsonError(400, 'This training needs your location to confirm you are at the venue. Allow location and try again.', {
        locationRequired: true,
      }),
    };
  }
  const accuracy = cleanAccuracy(body.location?.accuracy);
  const distance = Math.round(distanceMeters(training.venueLat, training.venueLng, coords.lat, coords.lng));
  if (!isWithinVenue(distance, accuracy, training.radiusMeters ?? 150)) {
    return {
      error: jsonError(
        403,
        `You appear to be about ${formatDistance(distance)} from the training venue. You must be at the venue to mark attendance. If you are in the room, turn on precise location / GPS and try again.`,
        { tooFar: true }
      ),
    };
  }
  return { distance, accuracy };
}

function maskId(id) {
  return id.length > 4 ? `${'•'.repeat(id.length - 4)}${id.slice(-4)}` : id;
}

function withDeviceCookie(res, deviceId, hadCookie) {
  if (!hadCookie) res.cookies.set(DEVICE_COOKIE, deviceId, deviceCookieOptions);
  return res;
}

export const GET = route(async (req, { params }) => {
  const { token } = await params;
  const training = await findByToken(token);
  if (!training) return jsonError(404, 'This attendance link is not valid. Please scan the QR code again.');

  const cookieId = cleanDeviceId(req.cookies.get(DEVICE_COOKIE)?.value);
  const storedId = cleanDeviceId(req.nextUrl.searchParams.get('d'));
  const knownIds = [...new Set([cookieId, storedId].filter(Boolean))];
  const deviceId = cookieId || storedId || newDeviceId();

  // Tell the page if this phone has already been used for this training.
  const used = knownIds.length
    ? await prisma.attendance.findFirst({
        where: { trainingId: training.id, deviceId: { in: knownIds } },
        select: { employeeId: true, employeeName: true, submittedAt: true },
      })
    : null;

  const res = json({
    training: publicTraining(training),
    deviceId,
    alreadySubmitted: used
      ? { employeeId: maskId(used.employeeId), employeeName: used.employeeName, submittedAt: used.submittedAt }
      : null,
  });
  return withDeviceCookie(res, deviceId, Boolean(cookieId));
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
  if (!/^\d{10}$/.test(employeeId)) {
    return jsonError(400, 'Employee ID must be exactly 10 digits (numbers only).');
  }
  if (employeeName.length < 2 || employeeName.length > 120) {
    return jsonError(400, 'Enter your full name.');
  }

  const place = checkLocation(training, body);
  if (place.error) return place.error;

  // The phone is recognised by its cookie or by the copy saved in the page's local storage,
  // so clearing only one of them is not enough to submit again.
  const cookieId = cleanDeviceId(req.cookies.get(DEVICE_COOKIE)?.value);
  const bodyId = cleanDeviceId(body.deviceId);
  const knownIds = [...new Set([cookieId, bodyId].filter(Boolean))];
  const deviceId = cookieId || bodyId || newDeviceId();

  if (knownIds.length > 0) {
    const used = await prisma.attendance.findFirst({
      where: { trainingId: training.id, deviceId: { in: knownIds } },
      select: { employeeId: true, employeeName: true, submittedAt: true },
    });
    if (used) {
      const samePerson = used.employeeId === employeeId;
      const res = jsonError(
        409,
        samePerson
          ? `You are already marked present for this training.`
          : `This phone has already been used to mark attendance for this training (Employee ID ${maskId(used.employeeId)}). Each participant must use their own phone.`,
        {
          deviceUsed: true,
          alreadySubmitted: { employeeId: maskId(used.employeeId), employeeName: used.employeeName, submittedAt: used.submittedAt },
        }
      );
      return withDeviceCookie(res, deviceId, Boolean(cookieId));
    }
  }

  try {
    const record = await prisma.attendance.create({
      data: {
        trainingId: training.id,
        employeeId,
        employeeName,
        deviceId,
        deviceHash: deviceHash(req),
        distanceMeters: place.distance ?? null,
        locationAccuracy: place.accuracy ?? null,
      },
    });
    const res = json({ ok: true, employeeId, employeeName, submittedAt: record.submittedAt, deviceId }, 201);
    return withDeviceCookie(res, deviceId, Boolean(cookieId));
  } catch (err) {
    if (isUniqueViolation(err)) {
      return jsonError(409, `Employee ID ${employeeId} is already marked present for this training.`, {
        duplicate: true,
      });
    }
    throw err;
  }
});
