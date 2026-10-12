// Distance between two coordinates in metres (haversine formula).
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function cleanCoords(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  if (la < -90 || la > 90 || ln < -180 || ln > 180) return null;
  if (la === 0 && ln === 0) return null;
  return { lat: la, lng: ln };
}

export function cleanAccuracy(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(Math.min(n, 100000)) : null;
}

export const RADIUS_OPTIONS = [50, 100, 150, 250, 500, 1000];

export function cleanRadius(value) {
  const n = Number(value);
  return RADIUS_OPTIONS.includes(n) ? n : null;
}

// GPS indoors is often off by tens of metres. Give the phone the benefit of the
// doubt for its reported accuracy, but never more than 100 m.
export const MAX_ACCURACY_ALLOWANCE = 100;

export function isWithinVenue(distance, accuracy, radius) {
  const allowance = Math.min(accuracy ?? 0, MAX_ACCURACY_ALLOWANCE);
  return distance <= radius + allowance;
}

export function formatDistance(m) {
  if (m == null) return '';
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}
