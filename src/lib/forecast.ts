import type { DailyForecast, HourlyForecast } from '@/api/ipma/types';

import { toIsoDate } from './dates';

/**
 * Returns the first forecast day that is today or later (IPMA occasionally
 * publishes the current day slightly late), falling back to the last day.
 */
export function pickCurrentDay(days: DailyForecast[], now: Date = new Date()): DailyForecast | null {
  const today = toIsoDate(now);
  const upcoming = days.find((day) => day.date >= today);

  return upcoming ?? days[days.length - 1] ?? null;
}

export function formatTemp(value: number): string {
  return `${Math.round(value)}°`;
}

export function formatRain(value: number | null): string {
  return value === null ? '—' : `${Math.round(value)}%`;
}

/** `dataPrev` values are UTC but serialized without a timezone marker. */
export function parseNaiveUtc(value: string): Date {
  return new Date(/(Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`);
}

/** Hourly entries are grouped by the device's local calendar day. */
export function localDateKey(value: string): string {
  return toIsoDate(parseNaiveUtc(value));
}

export function hourlyForDate(hourly: HourlyForecast[], date: string): HourlyForecast[] {
  return hourly.filter((item) => localDateKey(item.time) === date);
}

/** `14:00`, in the device's local time. */
export function formatHour(value: string): string {
  const date = parseNaiveUtc(value);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

/** Entry closest to 13:00 local, used for feels-like/humidity highlights. */
export function representativeHour(hourly: HourlyForecast[]): HourlyForecast | null {
  let best: HourlyForecast | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const item of hourly) {
    const distance = Math.abs(parseNaiveUtc(item.time).getHours() - 13);
    if (distance < bestDistance) {
      best = item;
      bestDistance = distance;
    }
  }

  return best;
}

export function maxWindSpeed(hourly: HourlyForecast[]): number | null {
  const values = hourly
    .map((item) => item.windSpeed)
    .filter((value): value is number => value !== null);

  return values.length > 0 ? Math.max(...values) : null;
}

/** True when the day includes 3-hourly points (later forecast days). */
export function hasThreeHourly(hourly: HourlyForecast[]): boolean {
  return hourly.some((item) => item.stepHours === 3);
}
