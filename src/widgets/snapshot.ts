import { fetchForecast, fetchLocations } from '@/api/ipma';
import type {
  DailyForecast,
  ForecastBundle,
  HourlyForecast,
  IpmaLocation,
  ReferenceData,
} from '@/api/ipma/types';
import type { Language } from '@/i18n';
import { toIsoDate } from '@/lib/dates';
import { parseNaiveUtc, pickCurrentDay } from '@/lib/forecast';
import { readJson, storageKeys, writeJson } from '@/storage/storage';

/**
 * Everything the widget needs, computed without React.
 *
 * The widget task handler runs in a headless JS context (no providers, no
 * hooks) and is killed after ~30 s, so this reads the same AsyncStorage caches
 * the app writes and only reaches the network when the cache is too old.
 * A network failure must degrade to cached/stale data, never to an error card.
 */
export const WIDGET_DAYS = 5;

/** Cached forecasts are revalidated at most once an hour from the widget. */
const STALE_MS = 60 * 60 * 1000;

/** An hourly entry only counts as "now" within ±90 minutes. */
const NEAREST_HOUR_MS = 90 * 60 * 1000;

type CachedLocations = {
  locations: IpmaLocation[];
  fetchedAt: number;
};

export type WidgetDay = {
  date: string;
  weatherTypeId: number;
  maxTemp: number;
  minTemp: number;
  rainProbability: number | null;
};

export type WidgetSnapshot = {
  language: Language;
  /** `null` until the user adds a favorite. */
  globalIdLocal: number | null;
  name: string | null;
  weatherTypeId: number | null;
  /** Temperature for the nearest published hour; `null` when IPMA has no hourly data. */
  nowTemp: number | null;
  maxTemp: number | null;
  minTemp: number | null;
  rainProbability: number | null;
  weatherLabel: string | null;
  days: WidgetDay[];
  fetchedAt: number | null;
};

export async function readWidgetSnapshot(now: Date = new Date()): Promise<WidgetSnapshot> {
  const language = await readLanguage();
  const favorites = await readJson<number[]>(storageKeys.favorites);
  const globalIdLocal = Array.isArray(favorites)
    ? (favorites.find((id) => Number.isFinite(id)) ?? null)
    : null;

  if (globalIdLocal === null) {
    return emptySnapshot(language);
  }

  const [name, bundle, reference] = await Promise.all([
    readName(globalIdLocal),
    readBundle(globalIdLocal),
    readJson<ReferenceData>(storageKeys.reference),
  ]);

  if (!bundle?.days?.length) {
    return { ...emptySnapshot(language), globalIdLocal, name };
  }

  const featured = pickCurrentDay(bundle.days, now);
  const entry = featured === null ? null : reference?.weatherTypes?.[featured.weatherTypeId];
  const label = language === 'pt' ? entry?.pt : entry?.en;

  return {
    language,
    globalIdLocal,
    name,
    weatherTypeId: featured?.weatherTypeId ?? null,
    nowTemp: nearestHourlyTemp(bundle.hourly, now),
    maxTemp: featured?.maxTemp ?? null,
    minTemp: featured?.minTemp ?? null,
    rainProbability: featured?.rainProbability ?? null,
    weatherLabel: label && label !== '---' ? label : null,
    days: upcomingDays(bundle.days, now),
    fetchedAt: bundle.fetchedAt,
  };
}

export function emptySnapshot(language: Language): WidgetSnapshot {
  return {
    language,
    globalIdLocal: null,
    name: null,
    weatherTypeId: null,
    nowTemp: null,
    maxTemp: null,
    minTemp: null,
    rainProbability: null,
    weatherLabel: null,
    days: [],
    fetchedAt: null,
  };
}

/**
 * The widget window is "today + the next four days", matching how the app
 * leads with the current day. IPMA occasionally publishes a day late, so the
 * window follows `pickCurrentDay` instead of the raw array position.
 */
export function upcomingDays(
  days: DailyForecast[],
  now: Date = new Date(),
  count: number = WIDGET_DAYS
): WidgetDay[] {
  const today = toIsoDate(now);
  const upcoming = days.filter((day) => day.date >= today);
  const source = upcoming.length > 0 ? upcoming : days.slice(-count);

  return source.slice(0, count).map((day) => ({
    date: day.date,
    weatherTypeId: day.weatherTypeId,
    maxTemp: day.maxTemp,
    minTemp: day.minTemp,
    rainProbability: day.rainProbability,
  }));
}

export function nearestHourlyTemp(
  hourly: HourlyForecast[],
  now: Date = new Date()
): number | null {
  const target = now.getTime();
  let best: { delta: number; temp: number } | null = null;

  for (const item of hourly) {
    const time = parseNaiveUtc(item.time).getTime();
    if (Number.isNaN(time)) {
      continue;
    }

    const delta = Math.abs(time - target);
    if (delta > NEAREST_HOUR_MS || (best !== null && delta >= best.delta)) {
      continue;
    }

    best = { delta, temp: item.temp };
  }

  return best === null ? null : best.temp;
}

async function readLanguage(): Promise<Language> {
  const stored = await readJson<Language>(storageKeys.language);

  return stored === 'en' ? 'en' : 'pt';
}

async function readName(globalIdLocal: number): Promise<string | null> {
  const cached = await readJson<CachedLocations>(storageKeys.locations);
  const found = cached?.locations?.find((item) => item.globalIdLocal === globalIdLocal);

  if (found) {
    return found.local;
  }

  try {
    const locations = await fetchLocations();
    void writeJson<CachedLocations>(storageKeys.locations, {
      locations,
      fetchedAt: Date.now(),
    });

    return locations.find((item) => item.globalIdLocal === globalIdLocal)?.local ?? null;
  } catch {
    return null;
  }
}

async function readBundle(globalIdLocal: number): Promise<ForecastBundle | null> {
  const key = storageKeys.forecast(globalIdLocal);
  const cached = await readJson<ForecastBundle>(key);

  if (cached?.days?.length && Date.now() - cached.fetchedAt < STALE_MS) {
    return cached;
  }

  try {
    const fresh = await fetchForecast(globalIdLocal);
    void writeJson(key, fresh);

    return fresh;
  } catch {
    return cached?.days?.length ? cached : null;
  }
}
