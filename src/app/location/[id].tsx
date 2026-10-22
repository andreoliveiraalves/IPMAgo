import { Stack, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ForecastDayRow } from '@/components/forecast-day-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WeatherIcon } from '@/components/weather-icon';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useForecast } from '@/hooks/use-forecast';
import { useLocations } from '@/hooks/use-locations';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { describeAge } from '@/lib/dates';
import { formatRain, formatTemp, pickCurrentDay } from '@/lib/forecast';
import { useFavorites } from '@/state/favorites';
import { useReferenceData } from '@/state/reference-data';

export default function LocationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const globalIdLocal = Number(id);
  const isValid = Number.isFinite(globalIdLocal);

  const theme = useTheme();
  const { t, language } = useI18n();
  const { locations } = useLocations();
  const { entry, isRefreshing, refresh } = useForecast(isValid ? globalIdLocal : null);
  const { isFavorite, toggle } = useFavorites();
  const { weatherLabel, windLabel } = useReferenceData();

  const location = locations.find((item) => item.globalIdLocal === globalIdLocal);
  const days = entry.bundle?.days ?? [];
  const current = pickCurrentDay(days);
  const favorite = isValid && isFavorite(globalIdLocal);

  const age = entry.bundle ? describeAge(entry.bundle.fetchedAt) : null;
  const ageLabel =
    age === null
      ? null
      : age.unit === 'now'
        ? t('updatedNow')
        : age.unit === 'minutes'
          ? t('updatedMinutes', { count: age.value })
          : t('updatedHours', { count: age.value });

  return (
    <>
      <Stack.Screen
        options={{
          title: location?.local ?? (language === 'pt' ? 'Previsão' : 'Forecast'),
          headerBackButtonDisplayMode: 'minimal',
          headerRight:
            isValid && location
              ? () => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={favorite ? t('removeFavorite') : t('addFavorite')}
                    accessibilityState={{ selected: favorite }}
                    hitSlop={12}
                    onPress={() => toggle(globalIdLocal)}>
                    <Text style={[styles.star, { color: theme.text }]}>
                      {favorite ? '★' : '☆'}
                    </Text>
                  </Pressable>
                )
              : undefined,
        }}
      />

      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                void refresh();
              }}
              tintColor={theme.textSecondary}
            />
          }>
          <View style={styles.inner}>
            {current ? (
              <View style={[styles.hero, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('today')}
                </ThemedText>

                <View style={styles.heroMain}>
                  <WeatherIcon
                    weatherTypeId={current.weatherTypeId}
                    size={64}
                    label={weatherLabel(current.weatherTypeId)}
                  />
                  <View style={styles.heroTemps}>
                    <ThemedText type="title" style={styles.heroMax}>
                      {formatTemp(current.maxTemp)}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('min')} {formatTemp(current.minTemp)}
                    </ThemedText>
                  </View>
                </View>

                <ThemedText>{weatherLabel(current.weatherTypeId)}</ThemedText>

                <View style={styles.heroMetrics}>
                  <View style={styles.metric}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('rain')}
                    </ThemedText>
                    <ThemedText type="smallBold">
                      {formatRain(current.rainProbability)}
                    </ThemedText>
                  </View>
                  <View style={styles.metric}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('wind')}
                    </ThemedText>
                    <ThemedText type="smallBold">
                      {current.windDirection} · {windLabel(current.windClass)}
                    </ThemedText>
                  </View>
                </View>
              </View>
            ) : entry.isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={theme.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary">
                  {t('loading')}
                </ThemedText>
              </View>
            ) : (
              <EmptyState
                emoji="📡"
                title={t('loadError')}
                description={entry.error ?? t('noData')}
                actionLabel={t('retry')}
                onAction={() => {
                  void refresh();
                }}
              />
            )}

            {days.length > 0 ? (
              <View style={styles.section}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {t('nextDays').toUpperCase()}
                </ThemedText>

                <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                  {days.map((day, index) => (
                    <View key={day.date}>
                      {index > 0 ? (
                        <View
                          style={[
                            styles.separator,
                            { backgroundColor: theme.backgroundSelected },
                          ]}
                        />
                      ) : null}
                      <ForecastDayRow day={day} />
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {entry.error && entry.bundle ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('offlineCache')}
              </ThemedText>
            ) : null}

            {ageLabel ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
                {ageLabel}
              </ThemedText>
            ) : null}
          </View>
        </ScrollView>
      </ThemedView>
    </>
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
  star: {
    fontSize: 22,
    lineHeight: 28,
  },
  hero: {
    borderRadius: Spacing.three,
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
  card: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
  },
  footer: {
    textAlign: 'center',
  },
});
