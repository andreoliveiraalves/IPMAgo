import type { DailyForecast } from '@/api/ipma/types';

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

export function formatRain(value: number): string {
  return `${Math.round(value)}%`;
}
