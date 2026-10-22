import { Pressable, StyleSheet, View } from 'react-native';

import type { DailyForecast } from '@/api/ipma/types';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { formatShortDate, formatWeekday, relativeDayKey } from '@/lib/dates';
import { formatRain, formatTemp } from '@/lib/forecast';
import { AppIcons } from '@/lib/weather';
import { useReferenceData } from '@/state/reference-data';

import { AppIcon } from './app-icon';
import { ThemedText } from './themed-text';
import { WeatherIcon } from './weather-icon';

type Props = {
  day: DailyForecast;
  onPress?: () => void;
};

export function ForecastDayRow({ day, onPress }: Props) {
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
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityHint={onPress ? t('dayDetailHint') : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
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

      {onPress ? <AppIcon name={AppIcons.chevronRight} size={20} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two + 2,
  },
  date: {
    width: 88,
    gap: 2,
  },
  summary: {
    flex: 1,
    gap: 2,
  },
  temps: {
    alignItems: 'flex-end',
    gap: 2,
    minWidth: 40,
  },
  pressed: {
    opacity: 0.6,
  },
});
