'use client';

// Ask the browser for the current position. Resolves { lat, lng, accuracy } or rejects
// with an Error whose message is ready to show to the person.
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('This browser cannot share location. Try Chrome or Safari.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        }),
      (err) => {
        if (err.code === 1) {
          reject(
            new Error(
              'Location access is blocked. Allow location for this site (tap the lock/“aA” icon in the address bar → Location → Allow), then try again.'
            )
          );
        } else if (err.code === 3) {
          reject(new Error('Getting your location took too long. Make sure location/GPS is on, then try again.'));
        } else {
          reject(new Error('Could not get your location. Turn on location/GPS and try again.'));
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  });
}
