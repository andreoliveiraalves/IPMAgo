import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import type { IpmaLocation } from '@/api/ipma/types';
import { Spacing } from '@/constants/theme';
import type { ForecastEntry } from '@/hooks/use-forecast-list';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatRain, formatTemp, pickCurrentDay } from '@/lib/forecast';
import { useReferenceData } from '@/state/reference-data';

import { ThemedText } from './themed-text';
import { WeatherIcon } from './weather-icon';

type Props = {
  location: IpmaLocation;
  entry: ForecastEntry;
  distanceKm?: number;
  onPress?: () => void;
  onLongPress?: () => void;
};

export function LocationCard({ location, entry, distanceKm, onPress, onLongPress }: Props) {
  const theme = useTheme();
  const { t } = useI18n();
  const { weatherLabel, windLabel } = useReferenceData();

  const day = entry.bundle ? pickCurrentDay(entry.bundle.days) : null;
  const isLoading = entry.isLoading && !day;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={location.local}
      accessibilityHint={t('locationsHint')}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [pressed && styles.pressed]}>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {location.local}
            </ThemedText>
            {distanceKm !== undefined ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('distanceAway', { km: distanceKm.toFixed(1) })}
              </ThemedText>
            ) : null}
          </View>

          {day ? (
            <WeatherIcon
              weatherTypeId={day.weatherTypeId}
              size={36}
              label={weatherLabel(day.weatherTypeId)}
            />
          ) : null}
        </View>

        {day ? (
          <View style={styles.body}>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {weatherLabel(day.weatherTypeId)}
            </ThemedText>

            <View style={styles.metrics}>
              <View style={styles.metric}>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('max')}
                </ThemedText>
                <ThemedText type="subtitle" themeColor="primary" style={styles.temperature}>
                  {formatTemp(day.maxTemp)}
                </ThemedText>
              </View>

              <View style={styles.metric}>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('min')}
                </ThemedText>
                <ThemedText style={styles.temperature}>{formatTemp(day.minTemp)}</ThemedText>
              </View>

              <View style={styles.metric}>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('rain')}
                </ThemedText>
                <ThemedText>{formatRain(day.rainProbability)}</ThemedText>
              </View>

              <View style={[styles.metric, styles.windMetric]}>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('wind')}
                </ThemedText>
                <ThemedText type="small" numberOfLines={1}>
                  {day.windDirection} · {windLabel(day.windClass)}
                </ThemedText>
              </View>
            </View>
          </View>
        ) : isLoading ? (
          <View style={styles.state}>
            <ActivityIndicator color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary">
              {t('loading')}
            </ThemedText>
          </View>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            {entry.error ? t('loadError') : t('noData')}
          </ThemedText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  body: {
    gap: Spacing.two,
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.three,
  },
  metric: {
    gap: 2,
  },
  windMetric: {
    flex: 1,
    alignItems: 'flex-end',
  },
  temperature: {
    lineHeight: 34,
  },
  state: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
