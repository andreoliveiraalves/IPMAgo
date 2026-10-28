import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { cardinal } from '@/api/marine';
import { AppIcon } from '@/components/app-icon';
import { EmptyState } from '@/components/empty-state';
import { HourlyChart } from '@/components/hourly-chart';
import { LoadingOverlay } from '@/components/loading-overlay';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TideChart } from '@/components/tide-chart';
import { WeatherIcon } from '@/components/weather-icon';
import { MaxContentWidth, Spacing, type ThemeColor } from '@/constants/theme';
import { useForecast } from '@/hooks/use-forecast';
import { useHazards } from '@/hooks/use-hazards';
import { useLocations } from '@/hooks/use-locations';
import { useMarine } from '@/hooks/use-marine';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatShortDate, formatWeekday, relativeDayKey } from '@/lib/dates';
import {
  fireRiskColor,
  fireRiskFor,
  fireRiskLabelKey,
} from '@/lib/fire-risk';
import {
  formatHour,
  formatRain,
  formatTemp,
  hasThreeHourly,
  hourlyChartWindow,
  hourlyForDate,
  localDateKey,
  maxWindSpeed,
  representativeHour,
} from '@/lib/forecast';
import {
  formatRange,
  nearestSeaZone,
  seaDayFor,
  seaDaysFrom,
  seaStateFor,
} from '@/lib/sea';
import { sunTimes, type SunDay } from '@/lib/sun';
import {
  nextTideEvents,
  tideEvents,
  tideEventsInDay,
  tideSeries,
} from '@/lib/tide';
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
  const parentSeaDay = nearest ? seaDayFor(hazards.sea, nearest.zone.globalIdLocal, date) : null;

  const relative = day ? relativeDayKey(day.date) : 'other';

  const marine = useMarine(
    nearest?.zone.globalIdLocal ?? null,
    nearest?.zone.latitude ?? null,
    nearest?.zone.longitude ?? null,
    day?.date ?? null
  );

  // The chart window can cross midnight, so one pair per covered day.
  const sunDays: SunDay[] = [];
  if (location && chartHours.length > 0) {
    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);
    const dates = Array.from(new Set(chartHours.map((hour) => localDateKey(hour.time)))).sort();

    for (const sunDate of dates) {
      sunDays.push(sunTimes(latitude, longitude, sunDate));
    }
  }

  const marineHours = marine.data?.hours ?? [];
  const tideSamples = tideSeries(marineHours, date);
  const allTideEvents = tideEvents(marineHours);
  const dayTideEvents = tideEventsInDay(allTideEvents, date);
  const upcomingTides = nextTideEvents(
    dayTideEvents,
    2,
    relative === 'today' ? new Date() : undefined
  );
  const marineHour =
    marineHours.find((hour) => hour.time.slice(0, 13) === highlight?.time.slice(0, 13)) ??
    tideSamples[0] ??
    null;
  const seaState = parentSeaDay ? seaStateFor(parentSeaDay.totalSeaMax) : null;
  const seaDays =
    nearest && parentSeaDay
      ? seaDaysFrom(hazards.sea, nearest.zone.globalIdLocal, date, 3)
      : [];

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
                      <HourlyChart
                        key={day.date}
                        hours={chartHours}
                        date={day.date}
                        sun={sunDays}
                      />
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
                        color={parentSeaDay ? theme.primary : theme.textSecondary}
                      />
                      <View style={styles.cardText}>
                        <ThemedText type="smallBold">{t('sea')}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {nearest.zone.name} · {t('distanceAway', { km: nearest.distanceKm.toFixed(0) })}
                        </ThemedText>
                      </View>
                    </View>

                    {parentSeaDay ? (
                      <View style={styles.seaGrid}>
                        <SeaMetric
                          label={t('waveHeight')}
                          value={formatRange(
                            parentSeaDay.waveHeightMin,
                            parentSeaDay.waveHeightMax,
                            'm'
                          )}
                        />
                        <SeaMetric
                          label={t('totalSea')}
                          value={formatRange(
                            parentSeaDay.totalSeaMin,
                            parentSeaDay.totalSeaMax,
                            'm'
                          )}
                        />
                        <SeaMetric
                          label={t('seaState')}
                          value={seaState === null ? '—' : t(`seaState${seaState}`)}
                        />
                        <SeaMetric
                          label={t('wavePeriod')}
                          value={formatRange(
                            parentSeaDay.wavePeriodMin,
                            parentSeaDay.wavePeriodMax,
                            's'
                          )}
                        />
                        <SeaMetric
                          label={t('waveDirection')}
                          value={parentSeaDay.waveDirection || '—'}
                        />
                        <SeaMetric
                          label={t('seaTemperature')}
                          value={formatRange(
                            parentSeaDay.seaTempMin,
                            parentSeaDay.seaTempMax,
                            '°C',
                            0
                          )}
                        />
                        <SeaMetric
                          label={t('swell')}
                          value={
                            marineHour?.swellHeight == null
                              ? '—'
                              : `${marineHour.swellHeight.toFixed(1)} m${
                                  marineHour.swellPeriod == null
                                    ? ''
                                    : ` · ${Math.round(marineHour.swellPeriod)} s`
                                }`
                          }
                        />
                        <SeaMetric
                          label={t('windSea')}
                          value={
                            marineHour?.windWaveHeight == null
                              ? '—'
                              : `${marineHour.windWaveHeight.toFixed(1)} m${
                                  marineHour.windWavePeriod == null
                                    ? ''
                                    : ` · ${Math.round(marineHour.windWavePeriod)} s`
                                }`
                          }
                        />
                      </View>
                    ) : null}

                    <View style={styles.inlineMetric}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {t('current')}
                      </ThemedText>
                      <ThemedText type="smallBold">
                        {marineHour?.currentKnots == null
                          ? '—'
                          : `${marineHour.currentKnots.toFixed(1)} kt${
                              cardinal(marineHour.currentDirection)
                                ? ` · ${cardinal(marineHour.currentDirection)}`
                                : ''
                            }`}
                      </ThemedText>
                    </View>

                    {upcomingTides.length > 0 ? (
                      <View style={styles.tideRow}>
                        {upcomingTides.map((event) => (
                          <View
                            key={`${event.kind}-${event.time.toISOString()}`}
                            style={[
                              styles.tideChip,
                              { backgroundColor: theme.backgroundSelected },
                            ]}>
                            <AppIcon
                              name={event.kind === 'high' ? AppIcons.tideHigh : AppIcons.tideLow}
                              size={14}
                              color={theme.primary}
                            />
                            <ThemedText type="small" themeColor="textSecondary">
                              {event.kind === 'high' ? t('highTide') : t('lowTide')}
                            </ThemedText>
                            <ThemedText type="smallBold">
                              {formatHour(event.time.toISOString())}
                            </ThemedText>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    {tideSamples.length > 1 ? (
                      <View style={styles.tideBlock}>
                        <ThemedText type="smallBold" themeColor="primary">
                          {t('tide').toUpperCase()}
                        </ThemedText>
                        <TideChart hours={tideSamples} events={dayTideEvents} />
                      </View>
                    ) : null}

                    {seaDays.length > 1 ? (
                      <View style={styles.seaDays}>
                        {seaDays.map((seaItem) => (
                          <View
                            key={seaItem.date}
                            style={[
                              styles.seaDay,
                              { backgroundColor: theme.backgroundSelected },
                            ]}>
                            <ThemedText type="small" themeColor="textSecondary">
                              {formatShortDate(seaItem.date)}
                            </ThemedText>
                            <ThemedText type="smallBold">
                              {formatRange(seaItem.waveHeightMin, seaItem.waveHeightMax, 'm')}
                            </ThemedText>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    {marineHour || tideSamples.length > 1 ? (
                      <ThemedText type="small" themeColor="textSecondary" style={styles.tideNote}>
                        {t('tideModelNote')}
                      </ThemedText>
                    ) : null}

                    {!parentSeaDay && !marineHour && tideSamples.length <= 1 ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        {hazards.isLoading && !hazards.sea ? t('loading') : t('seaUnavailable')}
                      </ThemedText>
                    ) : null}
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
  inlineMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  tideRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },  tideChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
  },
  tideBlock: {
    gap: Spacing.one,
  },
  tideNote: {
    fontSize: 11,
    lineHeight: 14,
  },
  seaDays: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  seaDay: {
    flex: 1,
    gap: 2,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(127, 127, 127, 0.12)',
  },
});
