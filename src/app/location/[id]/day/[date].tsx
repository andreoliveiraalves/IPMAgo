import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { EmptyState } from '@/components/empty-state';
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
  type FireRiskLevel,
} from '@/lib/fire-risk';
import {
  formatHour,
  formatRain,
  formatTemp,
  hasThreeHourly,
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
  const highlight = representativeHour(hourly);

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
                  <View style={styles.heroMain}>
                    <WeatherIcon
                      weatherTypeId={day.weatherTypeId}
                      size={72}
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

                  {hourly.length > 0 ? (
                    <>
                      {hasThreeHourly(hourly) ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          {t('hourlyStepHint')}
                        </ThemedText>
                      ) : null}
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.hours}>
                        {hourly.map((hour) => (
                          <View
                            key={hour.time}
                            style={[
                              styles.hourCard,
                              {
                                backgroundColor: theme.backgroundElement,
                                borderColor: theme.border,
                              },
                            ]}>
                            <ThemedText type="small" themeColor="textSecondary">
                              {formatHour(hour.time)}
                            </ThemedText>
                            <WeatherIcon
                              weatherTypeId={hour.weatherTypeId}
                              size={22}
                              label={weatherLabel(hour.weatherTypeId)}
                            />
                            <ThemedText type="smallBold">{formatTemp(hour.temp)}</ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">
                              {formatRain(hour.rainProbability)}
                            </ThemedText>
                          </View>
                        ))}
                      </ScrollView>
                    </>
                  ) : (
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('noHourlyData')}
                    </ThemedText>
                  )}
                </View>

                <View style={styles.grid}>
                  <MetricTile
                    icon={AppIcons.uv}
                    label={t('uvIndex')}
                    value={
                      day.uvIndex === null
                        ? '—'
                        : day.uvIndex.toFixed(1).replace('.0', '')
                    }
                    tone="accent"
                  />
                  <MetricTile
                    icon={AppIcons.water}
                    label={t('humidity')}
                    value={highlight?.humidity === null || !highlight ? '—' : `${Math.round(highlight.humidity)}%`}
                    tone="primary"
                  />
                  <MetricTile
                    icon={AppIcons.thermometer}
                    label={t('feelsLike')}
                    value={
                      highlight?.feelings === null || !highlight
                        ? '—'
                        : formatTemp(highlight.feelings)
                    }
                    tone="primary"
                  />
                  <MetricTile
                    icon={AppIcons.wind}
                    label={t('maxWind')}
                    value={
                      maxWindSpeed(hourly) === null
                        ? '—'
                        : `${Math.round(maxWindSpeed(hourly) as number)} km/h`
                    }
                    tone="primary"
                  />
                </View>

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
                      name={AppIcons.fire}
                      size={26}
                      color={risk ? fireRiskColor(risk) : theme.textSecondary}
                    />
                    <View style={styles.cardText}>
                      <ThemedText type="smallBold">{t('fireRisk')}</ThemedText>
                      {risk ? (
                        <ThemedText type="small" style={{ color: fireRiskColor(risk) }}>
                          {t(fireRiskLabelKey(risk))}
                        </ThemedText>
                      ) : (
                        <ThemedText type="small" themeColor="textSecondary">
                          {hazards.isLoading && !hazards.fire ? t('loading') : fireUnavailable}
                        </ThemedText>
                      )}
                    </View>
                    {risk ? <RiskBadge risk={risk} /> : null}
                  </View>
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
            ) : entry.isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={theme.primary} />
                <ThemedText type="small" themeColor="textSecondary">
                  {t('loading')}
                </ThemedText>
              </View>
            ) : (
              <EmptyState
                icon={AppIcons.alert}
                title={t('noData')}
                description={entry.error ?? t('forecastUnavailable')}
                actionLabel={t('retry')}
                onAction={() => {
                  void refresh();
                }}
              />
            )}
          </View>
        </ScrollView>
      </ThemedView>
    </>
  );
}

function MetricTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: AppIconName;
  label: string;
  value: string;
  tone: ThemeColor;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <View style={styles.tileHeader}>
        <AppIcon name={icon} size={18} themeColor={tone} />
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
      </View>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

function RiskBadge({ risk }: { risk: FireRiskLevel }) {
  return (
    <View style={[styles.badge, { backgroundColor: fireRiskColor(risk) }]}>
      <ThemedText
        type="smallBold"
        style={{ color: risk === 2 ? '#0F2A43' : '#FFFFFF' }}>
        {risk}/5
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
  heroMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  heroTemps: {
    gap: 2,
  },
  heroMax: {
    lineHeight: 52,
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
  hours: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  hourCard: {
    width: 64,
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
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
  badge: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
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
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
  },
});
