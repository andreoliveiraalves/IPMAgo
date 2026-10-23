import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { EmptyState } from '@/components/empty-state';
import { ForecastDayRow } from '@/components/forecast-day-row';
import { LoadingOverlay } from '@/components/loading-overlay';
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
import { AppIcons } from '@/lib/weather';
import { useFavorites } from '@/state/favorites';
import { useReferenceData } from '@/state/reference-data';

export default function LocationDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const globalIdLocal = Number(id);
  const isValid = Number.isFinite(globalIdLocal);

  const theme = useTheme();
  const { t } = useI18n();
  const { locations } = useLocations();
  const { entry, isRefreshing, refresh } = useForecast(isValid ? globalIdLocal : null);
  const { isFavorite, toggle } = useFavorites();
  const { weatherLabel, windLabel } = useReferenceData();

  const location = locations.find((item) => item.globalIdLocal === globalIdLocal);
  const days = entry.bundle?.days ?? [];
  const current = pickCurrentDay(days);
  const favorite = isValid && isFavorite(globalIdLocal);

  const age = entry.bundle ? describeAge(entry.bundle.updatedAt) : null;
  const ageLabel =
    age === null
      ? null
      : age.unit === 'now'
        ? t('updatedNow')
        : age.unit === 'minutes'
          ? t('updatedMinutes', { count: age.value })
          : t('updatedHours', { count: age.value });

  const openDay = (date: string) => {
    if (!isValid) {
      return;
    }

    router.push({
      pathname: '/location/[id]/day/[date]',
      params: { id: String(globalIdLocal), date },
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: location?.local ?? name ?? '',
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
                    <AppIcon
                      name={favorite ? AppIcons.starFilled : AppIcons.star}
                      size={24}
                      color={favorite ? theme.accent : theme.text}
                    />
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
              tintColor={theme.primary}
            />
          }>
          <View style={styles.inner}>
            {current ? (
              <Pressable
                accessibilityRole="button"
                accessibilityHint={t('dayDetailHint')}
                onPress={() => openDay(current.date)}
                style={({ pressed }) => pressed && styles.pressed}>
                <View
                  style={[
                    styles.hero,
                    {
                      backgroundColor: theme.backgroundSelected,
                      borderColor: theme.border,
                    },
                  ]}>
                  <View style={styles.heroTop}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('today')}
                    </ThemedText>
                    <AppIcon name={AppIcons.chevronRight} size={20} themeColor="primary" />
                  </View>

                  <View style={styles.heroMain}>
                    <WeatherIcon
                      weatherTypeId={current.weatherTypeId}
                      size={64}
                      label={weatherLabel(current.weatherTypeId)}
                    />
                    <View style={styles.heroTemps}>
                      <ThemedText type="title" themeColor="primary" style={styles.heroMax}>
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
              </Pressable>
            ) : !entry.isLoading ? (
              <EmptyState
                icon={AppIcons.cloudOff}
                title={t('loadError')}
                description={entry.error ?? t('noData')}
                actionLabel={t('retry')}
                onAction={() => {
                  void refresh();
                }}
              />
            ) : null}

            {days.length > 0 ? (
              <View style={styles.section}>
                <ThemedText type="smallBold" themeColor="primary">
                  {t('nextDays', { count: days.length }).toUpperCase()}
                </ThemedText>

                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.border,
                    },
                  ]}>
                  {days.map((day, index) => (
                    <View key={day.date}>
                      {index > 0 ? (
                        <View style={[styles.separator, { backgroundColor: theme.border }]} />
                      ) : null}
                      <ForecastDayRow day={day} onPress={() => openDay(day.date)} />
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
        <LoadingOverlay visible={!current && entry.isLoading} label={t('loading')} />
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
  hero: {
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  footer: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
