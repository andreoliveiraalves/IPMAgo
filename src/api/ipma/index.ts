import { IpmaError, requestJson } from './client';
import type {
  DailyForecast,
  IpmaDailyForecast,
  IpmaEnvelope,
  IpmaLocation,
  IpmaWeatherTypeClass,
  IpmaWindSpeedClass,
  ReferenceData,
} from './types';

/**
 * Deduplicates concurrent requests for the same resource (e.g. the same location
 * requested by the home screen and by the detail screen at the same time).
 */
const inFlight = new Map<string, Promise<unknown>>();

function once<T>(key: string, load: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = load().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);

  return promise;
}

function expectArray<T>(payload: IpmaEnvelope<T>, endpoint: string): T[] {
  if (!payload || !Array.isArray(payload.data)) {
    throw new IpmaError(`Unexpected payload from ${endpoint}`, 'payload');
  }

  return payload.data;
}

function toNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value));

  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export async function fetchLocations(signal?: AbortSignal): Promise<IpmaLocation[]> {
  return once('locations', async () => {
    const payload = await requestJson<IpmaEnvelope<IpmaLocation>>('/distrits-islands.json', {
      signal,
    });

    return expectArray(payload, 'distrits-islands')
      .filter((location) => Number.isFinite(Number(location.globalIdLocal)))
      .sort((a, b) => a.local.localeCompare(b.local, 'pt'));
  });
}

export async function fetchForecast(
  globalIdLocal: number,
  signal?: AbortSignal
): Promise<DailyForecast[]> {
  return once(`forecast:${globalIdLocal}`, async () => {
    const payload = await requestJson<IpmaEnvelope<IpmaDailyForecast>>(
      `/forecast/meteorology/cities/daily/${globalIdLocal}.json`,
      { signal }
    );

    return expectArray(payload, `daily/${globalIdLocal}`)
      .map((entry): DailyForecast | null => {
        const minTemp = toNumber(entry.tMin);
        const maxTemp = toNumber(entry.tMax);
        const rainProbability = toNumber(entry.precipitaProb);
        const windClass = toNumber(entry.classWindSpeed);

        if (
          !entry.forecastDate ||
          Number.isNaN(minTemp) ||
          Number.isNaN(maxTemp) ||
          Number.isNaN(rainProbability)
        ) {
          return null;
        }

        return {
          date: entry.forecastDate,
          minTemp,
          maxTemp,
          rainProbability,
          windDirection: entry.predWindDir ?? '',
          windClass: Number.isNaN(windClass) ? -99 : windClass,
          weatherTypeId: Number(entry.idWeatherType),
        };
      })
      .filter((day): day is DailyForecast => day !== null)
      .sort((a, b) => a.date.localeCompare(b.date));
  });
}

export async function fetchReferenceData(signal?: AbortSignal): Promise<ReferenceData> {
  return once('reference', async () => {
    const [weatherTypes, windClasses] = await Promise.all([
      requestJson<IpmaEnvelope<IpmaWeatherTypeClass>>('/weather-type-classe.json', { signal }),
      requestJson<IpmaEnvelope<IpmaWindSpeedClass>>('/wind-speed-daily-classe.json', { signal }),
    ]);

    const weatherTypeMap: ReferenceData['weatherTypes'] = {};
    for (const item of expectArray(weatherTypes, 'weather-type-classe')) {
      weatherTypeMap[item.idWeatherType] = {
        id: item.idWeatherType,
        pt: item.descWeatherTypePT.trim(),
        en: item.descWeatherTypeEN.trim(),
      };
    }

    const windClassMap: ReferenceData['windClasses'] = {};
    for (const item of expectArray(windClasses, 'wind-speed-daily-classe')) {
      const id = toNumber(item.classWindSpeed);
      if (!Number.isNaN(id)) {
        windClassMap[id] = {
          id,
          pt: item.descClassWindSpeedDailyPT.trim(),
          en: item.descClassWindSpeedDailyEN.trim(),
        };
      }
    }

    return { weatherTypes: weatherTypeMap, windClasses: windClassMap, fetchedAt: Date.now() };
  });
}

export type { DailyForecast, ReferenceData } from './types';
export { IpmaError } from './client';
