import { IpmaError } from '@/api/ipma/client';

/**
 * IPMA uses a fixed set of 30 weather type ids (plus -99 for "no data").
 * Keep in sync with https://api.ipma.pt/open-data/weather-type-classe.json
 */
const WEATHER_EMOJI: Record<number, string> = {
  0: '🌡️',
  1: '☀️',
  2: '🌤️',
  3: '⛅',
  4: '☁️',
  5: '☁️',
  6: '🌦️',
  7: '🌦️',
  8: '🌧️',
  9: '🌧️',
  10: '🌦️',
  11: '🌧️',
  12: '🌧️',
  13: '🌦️',
  14: '🌧️',
  15: '🌦️',
  16: '🌫️',
  17: '🌫️',
  18: '❄️',
  19: '⛈️',
  20: '⛈️',
  21: '🌨️',
  22: '❄️',
  23: '⛈️',
  24: '☁️',
  25: '🌤️',
  26: '🌫️',
  27: '☁️',
  28: '🌨️',
  29: '🌨️',
  30: '🌨️',
};

export function weatherEmoji(weatherTypeId: number): string {
  return WEATHER_EMOJI[weatherTypeId] ?? '🌡️';
}

export function asIpmaError(error: unknown): IpmaError {
  if (error instanceof IpmaError) {
    return error;
  }

  return new IpmaError(error instanceof Error ? error.message : String(error), 'network');
}
