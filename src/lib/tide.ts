import type { MarineHour } from '@/api/marine';

import { localDateKey, parseNaiveUtc } from './forecast';

export type TideEvent = {
  kind: 'high' | 'low';
  /** UTC instant, like every other timestamp in the app. */
  time: Date;
  /** Height relative to mean sea level (the model datum). */
  height: number;
};

/**
 * Extracts high/low tides from an hourly sea-level series.
 *
 * Hourly samples alone would place every tide on the hour. Fitting a parabola
 * through the three samples around each turning point recovers the real time
 * and height (typically within a few minutes of the model's own extremes).
 */
export function tideEvents(hours: MarineHour[]): TideEvent[] {
  const samples = hours
    .map((hour) => ({ time: parseNaiveUtc(hour.time).getTime(), height: hour.seaLevel }))
    .filter(
      (sample): sample is { time: number; height: number } => sample.height !== null
    );

  const events: TideEvent[] = [];

  for (let index = 1; index < samples.length - 1; index += 1) {
    const previous = samples[index - 1].height;
    const current = samples[index].height;
    const next = samples[index + 1].height;

    const isHigh = current >= previous && current >= next;
    const isLow = current <= previous && current <= next;

    if (!isHigh && !isLow) {
      continue;
    }

    const denominator = previous - 2 * current + next;
    // Flat or malformed triples have no meaningful vertex to interpolate.
    if (Math.abs(denominator) < 1e-6) {
      continue;
    }

    const offset = (0.5 * (previous - next)) / denominator;

    if (!Number.isFinite(offset) || Math.abs(offset) > 1) {
      continue;
    }

    const height = current - 0.25 * (previous - next) * offset;
    const instant = samples[index].time + offset * 60 * 60 * 1000;

    events.push({
      kind: isHigh ? 'high' : 'low',
      time: new Date(instant),
      height,
    });
  }

  return events;
}

/** Tide curve samples that belong to the device-local calendar day `date`. */
export function tideSeries(hours: MarineHour[], date: string): MarineHour[] {
  return hours.filter((hour) => localDateKey(hour.time) === date);
}

export function tideEventsInDay(events: TideEvent[], date: string): TideEvent[] {
  return events.filter((event) => localDateKey(event.time.toISOString()) === date);
}

/**
 * The next `count` events, skipping ones that already happened when `from` is
 * given. Falls back to the first events of the day when all of them are past.
 */
export function nextTideEvents(
  events: TideEvent[],
  count = 2,
  from?: Date
): TideEvent[] {
  if (!from) {
    return events.slice(0, count);
  }

  const upcoming = events.filter((event) => event.time.getTime() >= from.getTime());

  return (upcoming.length > 0 ? upcoming : events).slice(0, count);
}
