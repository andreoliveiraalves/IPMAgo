import type { IpmaLocation } from '@/api/ipma/types';

export type LatLng = {
  latitude: number;
  longitude: number;
};

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function nearestLocation(
  origin: LatLng,
  locations: IpmaLocation[]
): { location: IpmaLocation; distanceKm: number } | null {
  let best: { location: IpmaLocation; distanceKm: number } | null = null;

  for (const location of locations) {
    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      continue;
    }

    const distance = distanceKm(origin, { latitude, longitude });

    if (!best || distance < best.distanceKm) {
      best = { location, distanceKm: distance };
    }
  }

  return best;
}
