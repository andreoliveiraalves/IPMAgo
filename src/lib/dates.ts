import type { Language } from '@/i18n';

const WEEKDAYS: Record<Language, string[]> = {
  pt: [
    'domingo',
    'segunda-feira',
    'terça-feira',
    'quarta-feira',
    'quinta-feira',
    'sexta-feira',
    'sábado',
  ],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

/** Compact labels for tight strips (the home-screen widget). */
const WEEKDAYS_SHORT: Record<Language, string[]> = {
  pt: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
  en: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
};

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * Parses `YYYY-MM-DD` as a local date. `new Date('2026-10-22')` would be parsed as
 * UTC and can shift a day in western timezones, which matters for "today"/"tomorrow".
 */
export function parseIsoDate(value: string): Date | null {
  const match = ISO_DATE.exec(value);
  if (!match) {
    return null;
  }

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

  return Number.isNaN(date.getTime()) ? null : date;
}

export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

export function relativeDayKey(
  isoDate: string,
  now: Date = new Date()
): 'today' | 'tomorrow' | 'other' {
  const date = parseIsoDate(isoDate);
  if (!date) {
    return 'other';
  }

  if (toIsoDate(date) === toIsoDate(now)) {
    return 'today';
  }

  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (toIsoDate(date) === toIsoDate(tomorrow)) {
    return 'tomorrow';
  }

  return 'other';
}

export function formatWeekday(isoDate: string, language: Language): string {
  const date = parseIsoDate(isoDate);
  if (!date) {
    return isoDate;
  }

  const name = WEEKDAYS[language][date.getDay()];

  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function formatShortDate(isoDate: string): string {
  const date = parseIsoDate(isoDate);
  if (!date) {
    return isoDate;
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${day}/${month}`;
}

export function formatWeekdayShort(isoDate: string, language: Language): string {
  const date = parseIsoDate(isoDate);
  if (!date) {
    return isoDate;
  }

  return WEEKDAYS_SHORT[language][date.getDay()];
}

export type DataAge = { unit: 'now' } | { unit: 'minutes' | 'hours'; value: number };

export function describeAge(fetchedAt: number, now: number = Date.now()): DataAge {
  const minutes = Math.floor((now - fetchedAt) / 60_000);

  if (minutes < 1) {
    return { unit: 'now' };
  }

  if (minutes < 60) {
    return { unit: 'minutes', value: minutes };
  }

  return { unit: 'hours', value: Math.floor(minutes / 60) };
}
