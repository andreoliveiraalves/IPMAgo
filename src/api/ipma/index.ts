import { IpmaError, OPEN_DATA_BASE, PUBLIC_DATA_BASE, requestJson } from './client';
import type {
  DailyForecast,
  FireRiskBundle,
  FireRiskDay,
  ForecastBundle,
  HourlyForecast,
  IpmaAggregateEntry,
  IpmaDailyForecast,
  IpmaEnvelope,
  IpmaFireRiskFile,
  IpmaForecastEnvelope,
  IpmaLocation,
  IpmaSeaForecast,
  IpmaSeaLocation,
  IpmaWeatherTypeClass,
  IpmaWindSpeedClass,
  ReferenceData,
  SeaBundle,
  SeaForecastDay,
  SeaZone,
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

/** IPMA uses -99 (and occasionally absent fields) for "no data". */
function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = toNumber(value);

  return Number.isNaN(parsed) || parsed === -99 ? null : parsed;
}

/** `dataPrev`/`dataUpdate` are UTC but serialized without a timezone marker. */
function parseUtcTimestamp(value: string | undefined): number {
  if (!value) {
    return Number.NaN;
  }

  return Date.parse(/(Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`);
}

function dayKey(dataPrev: string): string {
  return dataPrev.slice(0, 10);
}

function compareLocations(a: IpmaLocation, b: IpmaLocation): number {
  return a.idDistrito - b.idDistrito || a.local.localeCompare(b.local, 'pt');
}

/**
 * All 423 municipalities/forecast points, straight from the same list the IPMA
 * website uses. Falls back to the documented 35-location open-data list.
 */
export async function fetchLocations(signal?: AbortSignal): Promise<IpmaLocation[]> {
  return once('locations', async () => {
    try {
      const payload = await requestJson<IpmaLocation[]>(
        PUBLIC_DATA_BASE,
        '/forecast/locations.json',
        { signal }
      );

      if (!Array.isArray(payload)) {
        throw new IpmaError('Unexpected locations payload', 'payload');
      }

      return payload
        .filter((location) => Number.isFinite(Number(location.globalIdLocal)))
        .sort(compareLocations);
    } catch (error) {
      try {
        const payload = await requestJson<IpmaEnvelope<IpmaLocation>>(
          OPEN_DATA_BASE,
          '/distrits-islands.json',
          { signal }
        );

        return expectArray(payload, 'distrits-islands')
          .filter((location) => Number.isFinite(Number(location.globalIdLocal)))
          .sort(compareLocations);
      } catch {
        throw error;
      }
    }
  });
}

/** IPMA publishes 10 daily entries in the aggregate feed; show all of them. */
const FORECAST_DAYS = 10;

function parseAggregate(
  globalIdLocal: number,
  entries: IpmaAggregateEntry[]
): ForecastBundle {
  if (!Array.isArray(entries)) {
    throw new IpmaError('Unexpected aggregate payload', 'payload');
  }

  const days: DailyForecast[] = [];
  const seenDates = new Set<string>();

  for (const entry of entries) {
    if (entry.idPeriodo !== 24 || !entry.dataPrev) {
      continue;
    }

    const date = dayKey(entry.dataPrev);
    if (seenDates.has(date)) {
      continue;
    }

    const minTemp = toNumber(entry.tMin);
    const maxTemp = toNumber(entry.tMax);
    if (Number.isNaN(minTemp) || Number.isNaN(maxTemp)) {
      continue;
    }

    seenDates.add(date);
    days.push({
      date,
      minTemp,
      maxTemp,
      rainProbability: optionalNumber(entry.probabilidadePrecipita),
      windDirection: entry.ddVento ?? '',
      windClass: optionalNumber(entry.idFfxVento) ?? -99,
      weatherTypeId: optionalNumber(entry.idTipoTempo) ?? -99,
      uvIndex: optionalNumber(entry.iUv),
    });
  }

  days.sort((a, b) => a.date.localeCompare(b.date));

  const hourly: HourlyForecast[] = [];

  for (const entry of entries) {
    if (entry.idPeriodo !== 1 && entry.idPeriodo !== 3) {
      continue;
    }

    const temp = optionalNumber(entry.tMed);
    if (temp === null || !entry.dataPrev) {
      continue;
    }

    hourly.push({
      time: entry.dataPrev,
      temp,
      feelings: optionalNumber(entry.utci),
      humidity: optionalNumber(entry.hR),
      windSpeed: optionalNumber(entry.ffVento),
      windDirection: entry.ddVento ?? '',
      rainProbability: optionalNumber(entry.probabilidadePrecipita),
      weatherTypeId: optionalNumber(entry.idTipoTempo) ?? -99,
      stepHours: entry.idPeriodo === 1 ? 1 : 3,
    });
  }

  hourly.sort((a, b) => a.time.localeCompare(b.time));

  const updatedAt = Math.max(
    ...entries.map((entry) => parseUtcTimestamp(entry.dataUpdate)).filter(Number.isFinite)
  );

  return {
    globalIdLocal,
    days: days.slice(0, FORECAST_DAYS),
    hourly,
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
    fetchedAt: Date.now(),
  };
}

function parseOpenDataDays(
  globalIdLocal: number,
  entries: IpmaDailyForecast[]
): ForecastBundle {
  const days = entries
    .map((entry): DailyForecast | null => {
      const minTemp = toNumber(entry.tMin);
      const maxTemp = toNumber(entry.tMax);

      if (!entry.forecastDate || Number.isNaN(minTemp) || Number.isNaN(maxTemp)) {
        return null;
      }

      return {
        date: entry.forecastDate,
        minTemp,
        maxTemp,
        rainProbability: optionalNumber(entry.precipitaProb),
        windDirection: entry.predWindDir ?? '',
        windClass: optionalNumber(entry.classWindSpeed) ?? -99,
        weatherTypeId: optionalNumber(entry.idWeatherType) ?? -99,
        uvIndex: null,
      };
    })
    .filter((day): day is DailyForecast => day !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    globalIdLocal,
    days: days.slice(0, FORECAST_DAYS),
    hourly: [],
    updatedAt: Date.now(),
    fetchedAt: Date.now(),
  };
}

/**
 * Forecast for any of the 423 locations.
 *
 * Primary source: the aggregate feed used by the IPMA website (10 days daily +
 * hourly/3-hourly). Fallback: the documented open-data daily endpoint, which
 * only exists for the 35 district capitals/islands.
 */
export async function fetchForecast(
  globalIdLocal: number,
  signal?: AbortSignal
): Promise<ForecastBundle> {
  return once(`forecast:${globalIdLocal}`, async () => {
    try {
      const entries = await requestJson<IpmaAggregateEntry[]>(
        PUBLIC_DATA_BASE,
        `/forecast/aggregate/${globalIdLocal}.json`,
        { signal }
      );

      return parseAggregate(globalIdLocal, entries);
    } catch (error) {
      try {
        const payload = await requestJson<IpmaEnvelope<IpmaDailyForecast>>(
          OPEN_DATA_BASE,
          `/forecast/meteorology/cities/daily/${globalIdLocal}.json`,
          { signal }
        );

        return parseOpenDataDays(globalIdLocal, expectArray(payload, 'daily'));
      } catch {
        throw error;
      }
    }
  });
}

export async function fetchReferenceData(signal?: AbortSignal): Promise<ReferenceData> {
  return once('reference', async () => {
    const [weatherTypes, windClasses] = await Promise.all([
      requestJson<IpmaEnvelope<IpmaWeatherTypeClass>>(
        OPEN_DATA_BASE,
        '/weather-type-classe.json',
        { signal }
      ),
      requestJson<IpmaEnvelope<IpmaWindSpeedClass>>(
        OPEN_DATA_BASE,
        '/wind-speed-daily-classe.json',
        { signal }
      ),
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

/**
 * Rural fire risk for the next 3 days, keyed by DICO (municipality code).
 * Only mainland Portugal is covered by open-data.
 */
export async function fetchFireRisk(signal?: AbortSignal): Promise<FireRiskBundle> {
  return once('fire-risk', async () => {
    const results = await Promise.allSettled(
      [0, 1, 2].map((offset) =>
        requestJson<IpmaFireRiskFile>(
          OPEN_DATA_BASE,
          `/forecast/meteorology/rcm/rcm-d${offset}.json`,
          { signal }
        )
      )
    );

    const days: FireRiskDay[] = [];
    let firstError: unknown = null;

    for (const result of results) {
      if (result.status === 'rejected') {
        firstError ??= result.reason;
        continue;
      }

      const file = result.value;
      if (!file?.dataPrev || !file.local) {
        continue;
      }

      const levels: Record<string, number> = {};
      for (const [dico, entry] of Object.entries(file.local)) {
        const level = entry?.data?.rcm;
        if (typeof level === 'number' && level >= 1 && level <= 5) {
          levels[dico] = level;
        }
      }

      days.push({ date: file.dataPrev, levels });
    }

    if (days.length === 0) {
      throw firstError ?? new IpmaError('No fire risk data available', 'payload');
    }

    days.sort((a, b) => a.date.localeCompare(b.date));

    return { days, fetchedAt: Date.now() };
  });
}

/**
 * Sea state for the 12 coastal zones, for the next 3 days.
 */
export async function fetchSeaForecast(signal?: AbortSignal): Promise<SeaBundle> {
  return once('sea', async () => {
    const [locations, forecasts] = await Promise.all([
      requestJson<IpmaSeaLocation[]>(OPEN_DATA_BASE, '/sea-locations.json', { signal }),
      Promise.allSettled(
        [0, 1, 2].map((offset) =>
          requestJson<IpmaForecastEnvelope<IpmaSeaForecast>>(
            OPEN_DATA_BASE,
            `/forecast/oceanography/daily/hp-daily-sea-forecast-day${offset}.json`,
            { signal }
          )
        )
      ),
    ]);

    if (!Array.isArray(locations)) {
      throw new IpmaError('Unexpected sea locations payload', 'payload');
    }

    const zones: SeaZone[] = locations
      .map((zone): SeaZone | null => {
        const latitude = toNumber(zone.latitude);
        const longitude = toNumber(zone.longitude);

        if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
          return null;
        }

        return {
          globalIdLocal: zone.globalIdLocal,
          name: zone.local,
          latitude,
          longitude,
        };
      })
      .filter((zone): zone is SeaZone => zone !== null);

    const daysByZone: Record<number, SeaForecastDay[]> = {};

    for (const forecast of forecasts) {
      if (forecast.status !== 'fulfilled') {
        continue;
      }

      const payload = forecast.value;
      if (!payload || !Array.isArray(payload.data)) {
        continue;
      }

      for (const entry of payload.data) {
        const waveHeightMin = toNumber(entry.waveHighMin);
        const waveHeightMax = toNumber(entry.waveHighMax);

        if (
          Number.isNaN(waveHeightMin) ||
          Number.isNaN(waveHeightMax) ||
          !payload.forecastDate
        ) {
          continue;
        }

        const day: SeaForecastDay = {
          date: payload.forecastDate,
          waveHeightMin,
          waveHeightMax,
          totalSeaMin: optionalNumber(entry.totalSeaMin) ?? waveHeightMin,
          totalSeaMax: optionalNumber(entry.totalSeaMax) ?? waveHeightMax,
          waveDirection: entry.predWaveDir ?? '',
          wavePeriodMin: optionalNumber(entry.wavePeriodMin),
          wavePeriodMax: optionalNumber(entry.wavePeriodMax),
          seaTempMin: optionalNumber(entry.sstMin),
          seaTempMax: optionalNumber(entry.sstMax),
        };

        (daysByZone[entry.globalIdLocal] ??= []).push(day);
      }
    }

    for (const zoneDays of Object.values(daysByZone)) {
      zoneDays.sort((a, b) => a.date.localeCompare(b.date));
    }

    return { zones, daysByZone, fetchedAt: Date.now() };
  });
}

export type {
  DailyForecast,
  FireRiskBundle,
  FireRiskDay,
  ForecastBundle,
  HourlyForecast,
  ReferenceData,
  SeaBundle,
  SeaForecastDay,
  SeaZone,
} from './types';
export { IpmaError } from './client';
