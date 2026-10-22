import type { IpmaLocation, SeaBundle, SeaForecastDay, SeaZone } from '@/api/ipma/types';

import { distanceKm } from './geo';

/**
 * Sea state is published for 12 coastal zones. Beyond this distance the sea
 * forecast is too far away to be meaningful for the selected place.
 */
export const SEA_MAX_DISTANCE_KM = 35;

export type NearestSeaZone = {
  zone: SeaZone;
  distanceKm: number;
};

export function nearestSeaZone(
  location: IpmaLocation | null,
  zones: SeaZone[]
): NearestSeaZone | null {
  if (!location || zones.length === 0) {
    return null;
  }

  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  let best: NearestSeaZone | null = null;

  for (const zone of zones) {
    const distance = distanceKm(
      { latitude, longitude },
      { latitude: zone.latitude, longitude: zone.longitude }
    );

    if (!best || distance < best.distanceKm) {
      best = { zone, distanceKm: distance };
    }
  }

  if (!best || best.distanceKm > SEA_MAX_DISTANCE_KM) {
    return null;
  }

  return best;
}

export function seaDayFor(
  bundle: SeaBundle | null,
  zoneId: number,
  date: string
): SeaForecastDay | null {
  return bundle?.daysByZone[zoneId]?.find((day) => day.date === date) ?? null;
}

export function formatRange(
  min: number | null,
  max: number | null,
  unit: string,
  fractionDigits = 1
): string {
  if (min === null && max === null) {
    return '—';
  }

  const format = (value: number) => value.toFixed(fractionDigits);

  if (min === null) {
    return `${format(max as number)} ${unit}`;
  }

  if (max === null) {
    return `${format(min)} ${unit}`;
  }

  return `${format(min)}–${format(max)} ${unit}`;
}
