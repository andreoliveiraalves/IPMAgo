import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { EmptyState } from '@/components/empty-state';
import { HourlyChart } from '@/components/hourly-chart';
import { LoadingOverlay } from '@/components/loading-overlay';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WeatherIcon } from '@/components/weather-icon';
import { MaxContentWidth, Spacing, type ThemeColor } from '@/constants/theme';
import { useForecast } from '@/hooks/use-forecast';
import { useHazards } from '@/hooks/use-hazards';
import { useLocations } from '@/hooks/use-locations';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatShortDate, formatWeekday, relativeDayKey } from '@/lib/dates';
import {
  fireRiskColor,
  fireRiskFor,
  fireRiskLabelKey,
} from '@/lib/fire-risk';
import {
  formatRain,
  formatTemp,
  hasThreeHourly,
  hourlyChartWindow,
  hourlyForDate,
  maxWindSpeed,
  representativeHour,
} from '@/lib/forecast';
import { formatRange, nearestSeaZone, seaDayFor } from '@/lib/sea';
import { AppIcons, type AppIconName } from '@/lib/weather';
import { useReferenceData } from '@/state/reference-data';

export default function DayDetailScreen() {
  const { id, date } = useLocalSearchParams<{ id: string; date: string }>();
  const router = useRouter();
  const globalIdLocal = Number(id);

  const theme = useTheme();
  const { t, language } = useI18n();
  const { locations } = useLocations();
  const { entry, refresh } = useForecast(Number.isFinite(globalIdLocal) ? globalIdLocal : null);
  const hazards = useHazards();
  const { weatherLabel, windLabel } = useReferenceData();

  const location = locations.find((item) => item.globalIdLocal === globalIdLocal) ?? null;
  const day = entry.bundle?.days.find((item) => item.date === date) ?? null;
  const hourly = day ? hourlyForDate(entry.bundle?.hourly ?? [], day.date) : [];
  const chartHours = day ? hourlyChartWindow(entry.bundle?.hourly ?? [], day.date) : [];
  const highlight = representativeHour(hourly);
  const maxWind = maxWindSpeed(hourly);

  const risk = fireRiskFor(hazards.fire, location, date);
  const nearest = nearestSeaZone(location, hazards.sea?.zones ?? []);
  const seaDay = nearest ? seaDayFor(hazards.sea, nearest.zone.globalIdLocal, date) : null;

  const relative = day ? relativeDayKey(day.date) : 'other';
  const dayTitle = day
    ? relative === 'today'
      ? `${t('today')} · ${formatShortDate(day.date)}`
      : relative === 'tomorrow'
        ? `${t('tomorrow')} · ${formatShortDate(day.date)}`
        : `${formatWeekday(day.date, language)} · ${formatShortDate(day.date)}`
    : t('dayDetails');

  const fireUnavailable =
    location && location.idDistrito <= 18
      ? t('fireRiskDayUnavailable')
      : t('fireRiskUnavailable');

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: dayTitle,
          presentation: 'modal',
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('close')}
              hitSlop={12}
              onPress={goBack}>
              <AppIcon name={AppIcons.close} size={24} color={theme.text} />
            </Pressable>
          ),
        }}
      />

      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.inner}>
            {day ? (
              <>
                <View
                  style={[
                    styles.hero,
                    {
                      backgroundColor: theme.backgroundSelected,
                      borderColor: theme.border,
                    },
                  ]}>
                  <View style={styles.heroBody}>
                    <View style={styles.heroNow}>
                      <View style={styles.heroMain}>
                        <WeatherIcon
                          weatherTypeId={day.weatherTypeId}
                          size={64}
                          label={weatherLabel(day.weatherTypeId)}
                        />
                        <View style={styles.heroTemps}>
                          <ThemedText type="title" themeColor="primary" style={styles.heroMax}>
                            {formatTemp(day.maxTemp)}
                          </ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {t('min')} {formatTemp(day.minTemp)}
                          </ThemedText>
                        </View>
                      </View>

                      <ThemedText>{weatherLabel(day.weatherTypeId)}</ThemedText>
                    </View>

                    <View style={styles.heroDetails}>
                      <HeroStat
                        icon={AppIcons.uv}
                        label={t('uvIndex')}
                        value={
                          day.uvIndex === null ? '—' : day.uvIndex.toFixed(1).replace('.0', '')
                        }
                        tone="accent"
                      />
                      <HeroStat
                        icon={AppIcons.water}
                        label={t('humidity')}
                        value={
                          highlight?.humidity == null
                            ? '—'
                            : `${Math.round(highlight.humidity)}%`
                        }
                        tone="primary"
                      />
                      <HeroStat
                        icon={AppIcons.thermometer}
                        label={t('feelsLike')}
                        value={
                          highlight?.feelings == null ? '—' : formatTemp(highlight.feelings)
                        }
                        tone="primary"
                      />
                      <HeroStat
                        icon={AppIcons.wind}
                        label={t('maxWind')}
                        value={maxWind === null ? '—' : `${Math.round(maxWind)} km/h`}
                        tone="primary"
                      />
                      <HeroStat
                        icon={AppIcons.fire}
                        label={t('fireRiskShort')}
                        value={risk ? t(fireRiskLabelKey(risk)) : '—'}
                        tone="textSecondary"
                        color={risk ? fireRiskColor(risk) : theme.textSecondary}
                        valueColor={risk ? fireRiskColor(risk) : undefined}
                        accessibilityLabel={`${t('fireRisk')}: ${
                          risk
                            ? t(fireRiskLabelKey(risk))
                            : hazards.isLoading && !hazards.fire
                              ? t('loading')
                              : fireUnavailable
                        }`}
                      />
                    </View>
                  </View>

                  <View style={styles.heroMetrics}>
                    <View style={styles.metric}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {t('rain')}
                      </ThemedText>
                      <ThemedText type="smallBold">{formatRain(day.rainProbability)}</ThemedText>
                    </View>
                    <View style={styles.metric}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {t('wind')}
                      </ThemedText>
                      <ThemedText type="smallBold">
                        {day.windDirection} · {windLabel(day.windClass)}
                      </ThemedText>
                    </View>
                  </View>
                </View>

                <View style={styles.section}>
                  <ThemedText type="smallBold" themeColor="primary">
                    {t('hourlyTemperature').toUpperCase()}
                  </ThemedText>

                  {chartHours.length > 0 ? (
                    <>
                      <ThemedText type="small" themeColor="textSecondary">
                        {hasThreeHourly(chartHours)
                          ? `${t('hourlyChartHint')} · ${t('hourlyStepHint')}`
                          : t('hourlyChartHint')}
                      </ThemedText>
                      <HourlyChart key={day.date} hours={chartHours} date={day.date} />
                    </>
                  ) : (
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('noHourlyData')}
                    </ThemedText>
                  )}
                </View>

                {nearest ? (
                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.border,
                      },
                    ]}>
                    <View style={styles.cardRow}>
                      <AppIcon
                        name={AppIcons.waves}
                        size={26}
                        color={seaDay ? theme.primary : theme.textSecondary}
                      />
                      <View style={styles.cardText}>
                        <ThemedText type="smallBold">{t('sea')}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {nearest.zone.name} · {t('distanceAway', { km: nearest.distanceKm.toFixed(0) })}
                        </ThemedText>
                      </View>
                    </View>

                    {seaDay ? (
                      <View style={styles.seaGrid}>
                        <SeaMetric
                          label={t('waveHeight')}
                          value={formatRange(seaDay.waveHeightMin, seaDay.waveHeightMax, 'm')}
                        />
                        <SeaMetric label={t('wind')} value={seaDay.waveDirection || '—'} />
                        <SeaMetric
                          label={t('wavePeriod')}
                          value={formatRange(seaDay.wavePeriodMin, seaDay.wavePeriodMax, 's')}
                        />
                        <SeaMetric
                          label={t('seaTemperature')}
                          value={formatRange(seaDay.seaTempMin, seaDay.seaTempMax, '°C', 0)}
                        />
                      </View>
                    ) : (
                      <ThemedText type="small" themeColor="textSecondary">
                        {hazards.isLoading && !hazards.sea ? t('loading') : t('seaUnavailable')}
                      </ThemedText>
                    )}
                  </View>
                ) : null}

                {hazards.error && (hazards.fire || hazards.sea) ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('offlineCache')}
                  </ThemedText>
                ) : null}
              </>
            ) : !entry.isLoading ? (
              <EmptyState
                icon={AppIcons.alert}
                title={t('noData')}
                description={entry.error ?? t('forecastUnavailable')}
                actionLabel={t('retry')}
                onAction={() => {
                  void refresh();
                }}
              />
            ) : null}
          </View>
        </ScrollView>
        <LoadingOverlay visible={!day && entry.isLoading} label={t('loading')} />
      </ThemedView>
    </>
  );
}

function HeroStat({
  icon,
  label,
  value,
  tone,
  color,
  valueColor,
  accessibilityLabel,
}: {
  icon: AppIconName;
  label: string;
  value: string;
  tone: ThemeColor;
  color?: string;
  valueColor?: string;
  accessibilityLabel?: string;
}) {
  return (
    <View
      style={styles.heroStat}
      accessible={accessibilityLabel ? true : undefined}
      accessibilityLabel={accessibilityLabel}>
      <AppIcon name={icon} size={14} color={color} themeColor={tone} />
      <ThemedText
        type="small"
        themeColor="textSecondary"
        numberOfLines={1}
        style={styles.heroStatLabel}>
        {label}
      </ThemedText>
      <ThemedText
        type="smallBold"
        numberOfLines={1}
        style={[styles.heroStatValue, valueColor ? { color: valueColor } : null]}>
        {value}
      </ThemedText>
    </View>
  );
}

function SeaMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.seaMetric}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.five,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
    paddingTop: Spacing.three,
  },
  hero: {
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  heroBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.three,
  },
  heroNow: {
    flex: 1,
    minWidth: 120,
    gap: Spacing.two,
  },
  heroMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  heroTemps: {
    gap: 2,
  },
  heroMax: {
    lineHeight: 52,
  },
  heroDetails: {
    width: 152,
    gap: Spacing.two,
  },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  heroStatLabel: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  heroStatValue: {
    flexShrink: 0,
    fontSize: 12,
    lineHeight: 16,
  },
  heroMetrics: {
    flexDirection: 'row',
    gap: Spacing.five,
    marginTop: Spacing.two,
  },
  metric: {
    gap: 2,
  },
  section: {
    gap: Spacing.two,
  },
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
    seaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Spacing.two,
  },
  seaMetric: {
    width: '50%',
    gap: 2,
  },
});
