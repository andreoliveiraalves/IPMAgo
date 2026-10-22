import { StyleSheet, View } from 'react-native';

import type { DailyForecast } from '@/api/ipma/types';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { formatShortDate, formatWeekday, relativeDayKey } from '@/lib/dates';
import { formatRain, formatTemp } from '@/lib/forecast';
import { useReferenceData } from '@/state/reference-data';

import { ThemedText } from './themed-text';
import { WeatherIcon } from './weather-icon';

export function ForecastDayRow({ day }: { day: DailyForecast }) {
  const { t, language } = useI18n();
  const { weatherLabel, windLabel } = useReferenceData();

  const relative = relativeDayKey(day.date);
  const dayLabel =
    relative === 'today'
      ? t('today')
      : relative === 'tomorrow'
        ? t('tomorrow')
        : formatWeekday(day.date, language);

  return (
    <View style={styles.row}>
      <View style={styles.date}>
        <ThemedText type="smallBold">{dayLabel}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatShortDate(day.date)}
        </ThemedText>
      </View>

      <WeatherIcon
        weatherTypeId={day.weatherTypeId}
        size={26}
        label={weatherLabel(day.weatherTypeId)}
      />

      <View style={styles.summary}>
        <ThemedText type="small" numberOfLines={2}>
          {weatherLabel(day.weatherTypeId)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {day.windDirection} · {windLabel(day.windClass)} · {formatRain(day.rainProbability)}
        </ThemedText>
      </View>

      <View style={styles.temps}>
        <ThemedText type="smallBold">{formatTemp(day.maxTemp)}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatTemp(day.minTemp)}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  date: {
    width: 92,
    gap: 2,
  },
  summary: {
    flex: 1,
    gap: 2,
  },
  temps: {
    alignItems: 'flex-end',
    gap: 2,
    minWidth: 44,
  },
});
