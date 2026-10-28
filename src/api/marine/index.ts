import { IpmaError, requestJson } from '@/api/ipma/client';

/**
 * Open-Meteo Marine fills the gaps IPMA leaves: IPMA publishes no tides and no
 * split between swell and wind waves. Data comes from the Copernicus Marine
 * model, is free of charge and needs no key, but it is a global model — tides
 * can be ~1 h off the official Hydrographic Institute tables, so the UI labels
 * it as a model and never as navigation data.
 */
export const MARINE_BASE = 'https://marine-api.open-meteo.com';

/** One forecast hour. `time` is naive UTC, matching the IPMA payloads. */
export type MarineHour = {
  time: string;
  seaLevel: number | null;
  swellHeight: number | null;
  swellPeriod: number | null;
  swellDirection: number | null;
  windWaveHeight: number | null;
  windWavePeriod: number | null;
  /** Speed over ground, already converted from the API's km/h. */
  currentKnots: number | null;
  currentDirection: number | null;
};

export type MarineBundle = {
  hours: MarineHour[];
  fetchedAt: number;
};

type MarineResponse = {
  hourly?: {
    time?: string[];
    sea_level_height_msl?: (number | null)[];
    swell_wave_height?: (number | null)[];
    swell_wave_period?: (number | null)[];
    swell_wave_direction?: (number | null)[];
    wind_wave_height?: (number | null)[];
    wind_wave_period?: (number | null)[];
    ocean_current_velocity?: (number | null)[];
    ocean_current_direction?: (number | null)[];
  };
};

const KMH_TO_KNOTS = 0.539957;

function num(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Compass point for a meteorological bearing in degrees. */
export function cardinal(degrees: number | null): string | null {
  if (degrees === null) {
    return null;
  }

  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round((((degrees % 360) + 360) % 360) / 45) % 8;

  return points[index];
}

/**
 * Hourly marine data for the window `[startDate, endDate]` (inclusive, both
 * `YYYY-MM-DD`). Returns hours in UTC so tide extremes line up with the naive
 * UTC timestamps IPMA sends.
 */
export async function fetchMarine(
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string,
  signal?: AbortSignal
): Promise<MarineBundle> {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    hourly: [
      'sea_level_height_msl',
      'swell_wave_height',
      'swell_wave_period',
      'swell_wave_direction',
      'wind_wave_height',
      'wind_wave_period',
      'ocean_current_velocity',
      'ocean_current_direction',
    ].join(','),
    start_date: startDate,
    end_date: endDate,
    timezone: 'UTC',
  });

  const payload = await requestJson<MarineResponse>(MARINE_BASE, `/v1/marine?${params}`, {
    signal,
    timeoutMs: 10_000,
  });

  const times = payload.hourly?.time;

  if (!Array.isArray(times) || times.length === 0) {
    throw new IpmaError('Marine payload without hourly data', 'payload');
  }

  const hourly = payload.hourly as NonNullable<MarineResponse['hourly']>;
  const currents = hourly.ocean_current_velocity ?? [];

  const hours: MarineHour[] = times.map((time, index) => ({
    time,
    seaLevel: num(hourly.sea_level_height_msl?.[index]),
    swellHeight: num(hourly.swell_wave_height?.[index]),
    swellPeriod: num(hourly.swell_wave_period?.[index]),
    swellDirection: num(hourly.swell_wave_direction?.[index]),
    windWaveHeight: num(hourly.wind_wave_height?.[index]),
    windWavePeriod: num(hourly.wind_wave_period?.[index]),
    currentKnots:
      currents[index] == null ? null : Number((currents[index]! * KMH_TO_KNOTS).toFixed(1)),
    currentDirection: num(hourly.ocean_current_direction?.[index]),
  }));

  return { hours, fetchedAt: Date.now() };
}
