import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { IpmaLocation } from '@/api/ipma/types';
import { EmptyState } from '@/components/empty-state';
import { LanguageToggle } from '@/components/language-toggle';
import { LocationCard } from '@/components/location-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { EMPTY_ENTRY, useForecastList } from '@/hooks/use-forecast-list';
import { useLocations } from '@/hooks/use-locations';
import { useNearestLocation } from '@/hooks/use-nearest-location';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { describeAge } from '@/lib/dates';
import { useFavorites } from '@/state/favorites';

export default function FavoritesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();
  const { ids, ready, remove } = useFavorites();
  const { locations, isLoading: locationsLoading } = useLocations();
  const { status, match, requestPermission } = useNearestLocation(locations);

  const watchedIds = useMemo(() => {
    const matchId = match?.location.globalIdLocal;

    if (matchId === undefined || ids.includes(matchId)) {
      return ids;
    }

    return [...ids, matchId];
  }, [ids, match]);

  const { entries, isRefreshing, refresh } = useForecastList(watchedIds);

  const favorites = useMemo(
    () =>
      ids
        .map((id) => locations.find((location) => location.globalIdLocal === id))
        .filter((location): location is IpmaLocation => location !== undefined),
    [ids, locations]
  );

  const latestFetch = useMemo(() => {
    const timestamps = Object.values(entries)
      .map((entry) => entry.bundle?.fetchedAt)
      .filter((value): value is number => typeof value === 'number');

    return timestamps.length > 0 ? Math.max(...timestamps) : null;
  }, [entries]);

  const hasCachedError = Object.values(entries).some((entry) => entry.error && entry.bundle);

  const age = latestFetch === null ? null : describeAge(latestFetch);
  const ageLabel =
    age === null
      ? null
      : age.unit === 'now'
        ? t('updatedNow')
        : age.unit === 'minutes'
          ? t('updatedMinutes', { count: age.value })
          : t('updatedHours', { count: age.value });

  const openLocation = (globalIdLocal: number) => {
    router.push({ pathname: '/location/[id]', params: { id: String(globalIdLocal) } });
  };

  const confirmRemove = (location: IpmaLocation) => {
    Alert.alert(t('removeTitle'), t('removeMessage', { name: location.local }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('remove'),
        style: 'destructive',
        onPress: () => remove(location.globalIdLocal),
      },
    ]);
  };

  const locationPrompt =
    match === null ? (
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void requestPermission();
        }}
        disabled={status === 'locating'}
        style={({ pressed }) => [
          styles.locationPrompt,
          { backgroundColor: theme.backgroundElement },
          pressed && styles.pressed,
        ]}>
        <ThemedText style={styles.promptEmoji}>📍</ThemedText>
        <View style={styles.promptText}>
          <ThemedText type="smallBold">
            {status === 'locating'
              ? t('locating')
              : status === 'denied'
                ? t('locationDenied')
                : status === 'unavailable' || status === 'error'
                  ? t('locationError')
                  : t('enableLocation')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {status === 'denied' ? t('locationDeniedHint') : t('locationsHint')}
          </ThemedText>
        </View>
        {status === 'locating' ? (
          <ActivityIndicator size="small" color={theme.textSecondary} />
        ) : null}
      </Pressable>
    ) : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
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
            <View style={styles.header}>
              <ThemedText type="subtitle">{t('appName')}</ThemedText>
              <LanguageToggle />
            </View>

            {match !== null ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {t('myLocation').toUpperCase()}
                  </ThemedText>
                </View>
                <LocationCard
                  location={match.location}
                  entry={entries[match.location.globalIdLocal] ?? EMPTY_ENTRY}
                  distanceKm={match.distanceKm}
                  onPress={() => openLocation(match.location.globalIdLocal)}
                />
              </View>
            ) : (
              locationPrompt
            )}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {t('favorites').toUpperCase()}
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/explore')}
                  hitSlop={8}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('browseLocations')}
                  </ThemedText>
                </Pressable>
              </View>

              {favorites.length > 0 ? (
                <View style={styles.list}>
                  {favorites.map((location) => (
                    <LocationCard
                      key={location.globalIdLocal}
                      location={location}
                      entry={entries[location.globalIdLocal] ?? EMPTY_ENTRY}
                      onPress={() => openLocation(location.globalIdLocal)}
                      onLongPress={() => confirmRemove(location)}
                    />
                  ))}
                </View>
              ) : !ready || locationsLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={theme.textSecondary} />
                  <ThemedText type="small" themeColor="textSecondary">
                    {t('loading')}
                  </ThemedText>
                </View>
              ) : (
                <EmptyState
                  emoji="⭐"
                  title={t('noFavorites')}
                  description={t('noFavoritesHint')}
                  actionLabel={t('browseLocations')}
                  onAction={() => router.push('/explore')}
                />
              )}
            </View>

            {hasCachedError ? (
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
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
    paddingTop: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.two,
  },
  locationPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  promptEmoji: {
    fontSize: 24,
    lineHeight: 30,
  },
  promptText: {
    flex: 1,
    gap: 2,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  footer: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
