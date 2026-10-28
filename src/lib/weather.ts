import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

import { IpmaError } from '@/api/ipma/client';
import type { ThemeColor } from '@/constants/theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type WeatherTone = 'sun' | 'partly' | 'cloud' | 'rain' | 'storm' | 'snow' | 'fog' | 'neutral';

type Glyph = {
  name: IconName;
  tone: WeatherTone;
};

/**
 * IPMA weather type ids (0-30, plus -99 for "no data").
 * Keep in sync with https://api.ipma.pt/open-data/weather-type-classe.json
 */
const WEATHER_GLYPHS: Record<number, Glyph> = {
  0: { name: 'thermometer', tone: 'neutral' },
  1: { name: 'weather-sunny', tone: 'sun' },
  2: { name: 'weather-partly-cloudy', tone: 'partly' },
  3: { name: 'weather-partly-cloudy', tone: 'partly' },
  4: { name: 'weather-cloudy', tone: 'cloud' },
  5: { name: 'weather-cloudy', tone: 'cloud' },
  6: { name: 'weather-cloudy', tone: 'cloud' },
  7: { name: 'weather-partly-rainy', tone: 'rain' },
  8: { name: 'weather-rainy', tone: 'rain' },
  9: { name: 'weather-pouring', tone: 'rain' },
  10: { name: 'weather-rainy', tone: 'rain' },
  11: { name: 'weather-rainy', tone: 'rain' },
  12: { name: 'weather-pouring', tone: 'rain' },
  13: { name: 'weather-partly-rainy', tone: 'rain' },
  14: { name: 'weather-rainy', tone: 'rain' },
  15: { name: 'weather-pouring', tone: 'rain' },
  16: { name: 'weather-fog', tone: 'fog' },
  17: { name: 'weather-fog', tone: 'fog' },
  18: { name: 'weather-snowy-heavy', tone: 'snow' },
  19: { name: 'weather-lightning', tone: 'storm' },
  20: { name: 'weather-lightning-rainy', tone: 'storm' },
  21: { name: 'weather-hail', tone: 'storm' },
  22: { name: 'weather-hail', tone: 'storm' },
  23: { name: 'weather-snowy-rainy', tone: 'storm' },
  24: { name: 'weather-cloudy', tone: 'cloud' },
  25: { name: 'weather-partly-cloudy', tone: 'partly' },
  26: { name: 'weather-fog', tone: 'fog' },
  27: { name: 'weather-cloudy', tone: 'cloud' },
  28: { name: 'weather-snowy', tone: 'snow' },
  29: { name: 'weather-snowy-heavy', tone: 'snow' },
  30: { name: 'weather-snowy-heavy', tone: 'snow' },
};

const TONE_COLORS: Record<WeatherTone, ThemeColor> = {
  sun: 'accent',
  partly: 'accent',
  cloud: 'textSecondary',
  rain: 'primary',
  storm: 'primary',
  snow: 'primarySoft',
  fog: 'textSecondary',
  neutral: 'textSecondary',
};

export function weatherGlyph(weatherTypeId: number): Glyph {
  return WEATHER_GLYPHS[weatherTypeId] ?? { name: 'weather-cloudy', tone: 'neutral' };
}

export function weatherToneColor(tone: WeatherTone): ThemeColor {
  return TONE_COLORS[tone];
}

/** Icons used outside the forecast (hazards, metrics, empty states). */
export const AppIcons = {
  star: 'star-outline' as IconName,
  starFilled: 'star' as IconName,
  chevronRight: 'chevron-right' as IconName,
  close: 'close' as IconName,
  location: 'map-marker-outline' as IconName,
  locationOff: 'map-marker-off-outline' as IconName,
  search: 'magnify' as IconName,
  cloudOff: 'cloud-off-outline' as IconName,
  fire: 'fire' as IconName,
  waves: 'waves' as IconName,
  water: 'water-percent' as IconName,
  thermometer: 'thermometer' as IconName,
  wind: 'weather-windy' as IconName,
  uv: 'white-balance-sunny' as IconName,
  sunrise: 'weather-sunset-up' as IconName,
  sunset: 'weather-sunset-down' as IconName,
  tideHigh: 'arrow-up' as IconName,
  tideLow: 'arrow-down' as IconName,
  clock: 'clock-outline' as IconName,
  refresh: 'refresh' as IconName,
  alert: 'alert-circle-outline' as IconName,
};

export type AppIconName = IconName;

export function asIpmaError(error: unknown): IpmaError {
  if (error instanceof IpmaError) {
    return error;
  }

  return new IpmaError(error instanceof Error ? error.message : String(error), 'network');
}
