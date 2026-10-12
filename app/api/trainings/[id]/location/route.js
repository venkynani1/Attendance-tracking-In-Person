import { prisma } from '@/lib/prisma';
import { json, jsonError, readJson, route } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { includeCreator, loadTrainingForUser, serializeTraining } from '@/lib/trainings';
import { cleanAccuracy, cleanCoords, cleanRadius } from '@/lib/geo';

// Set the venue / radius and switch the location check on or off.
export const PATCH = route(async (req, { params }) => {
  const { user, error } = await requireUser();
  if (error) return error;
  const { id } = await params;
  const training = await loadTrainingForUser(user, id);
  if (!training) return jsonError(404, 'Training not found.');

  const body = await readJson(req);
  const data = {};

  if (body.venue) {
    const coords = cleanCoords(body.venue.lat, body.venue.lng);
    if (!coords) return jsonError(400, 'Could not read your location. Allow location and try again.');
    data.venueLat = coords.lat;
    data.venueLng = coords.lng;
    data.venueAccuracy = cleanAccuracy(body.venue.accuracy);
  }
  if (body.radiusMeters !== undefined) {
    const radius = cleanRadius(body.radiusMeters);
    if (radius === null) return jsonError(400, 'Choose a valid radius.');
    data.radiusMeters = radius;
  }
  if (body.requireLocation !== undefined) {
    data.requireLocation = Boolean(body.requireLocation);
    const hasVenue = data.venueLat != null || training.venueLat != null;
    if (data.requireLocation && !hasVenue) {
      return jsonError(400, 'Set the venue location first.');
    }
  }

  const updated = await prisma.training.update({
    where: { id: training.id },
    data,
    include: { ...includeCreator, _count: { select: { attendance: true, roster: true } } },
  });
  return json({ training: serializeTraining(updated) });
});
