import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { IpmaLocation } from '@/api/ipma/types';
import { AppIcon } from '@/components/app-icon';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useLocations } from '@/hooks/use-locations';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { districtName } from '@/lib/districts';
import { AppIcons } from '@/lib/weather';
import { useFavorites } from '@/state/favorites';

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

type Section = {
  districtId: number;
  title: string;
  data: IpmaLocation[];
};

type RowProps = {
  location: IpmaLocation;
  isFavorite: boolean;
  onPress: () => void;
  onToggle: () => void;
};

function LocationRow({ location, isFavorite, onPress, onToggle }: RowProps) {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={location.local}
      accessibilityHint={t('locationsHint')}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <ThemedText type="smallBold" numberOfLines={1} style={styles.rowLabel}>
        {location.local}
      </ThemedText>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isFavorite ? t('removeFavorite') : t('addFavorite')}
        accessibilityState={{ selected: isFavorite }}
        hitSlop={12}
        onPress={onToggle}
        style={styles.star}>
        <AppIcon
          name={isFavorite ? AppIcons.starFilled : AppIcons.star}
          size={22}
          color={isFavorite ? theme.accent : theme.textSecondary}
        />
      </Pressable>
    </Pressable>
  );
}

export default function ExploreScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t, language } = useI18n();
  const { locations, isLoading, error, refresh } = useLocations();
  const { isFavorite, toggle } = useFavorites();
  const [query, setQuery] = useState('');

  const sections = useMemo<Section[]>(() => {
    const needle = normalize(query);
    const groups = new Map<number, IpmaLocation[]>();

    for (const location of locations) {
      const district = districtName(location.idDistrito, language);

      if (
        needle &&
        !normalize(location.local).includes(needle) &&
        !normalize(district).includes(needle)
      ) {
        continue;
      }

      const group = groups.get(location.idDistrito);
      if (group) {
        group.push(location);
      } else {
        groups.set(location.idDistrito, [location]);
      }
    }

    return [...groups.entries()]
      .sort(([a], [b]) => a - b)
      .map(([districtId, data]) => ({
        districtId,
        title: districtName(districtId, language),
        data,
      }));
  }, [locations, query, language]);

  const resultCount = useMemo(
    () => sections.reduce((total, section) => total + section.data.length, 0),
    [sections]
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.inner}>
          <View style={styles.header}>
            <ThemedText type="subtitle" themeColor="primary">
              {t('tabLocations')}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {resultCount}
            </ThemedText>
          </View>

          <View
            style={[
              styles.searchBox,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}>
            <AppIcon name={AppIcons.search} size={20} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('searchPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              style={[styles.search, { color: theme.text }]}
            />
          </View>

          {isLoading && locations.length === 0 ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={theme.primary} />
              <ThemedText type="small" themeColor="textSecondary">
                {t('loading')}
              </ThemedText>
            </View>
          ) : null}

          {!isLoading && locations.length === 0 ? (
            <EmptyState
              icon={AppIcons.cloudOff}
              title={t('loadError')}
              description={error ?? t('noData')}
              actionLabel={t('retry')}
              onAction={() => {
                void refresh();
              }}
            />
          ) : null}

          <SectionList
            sections={sections}
            keyExtractor={(item) => String(item.globalIdLocal)}
            keyboardShouldPersistTaps="handled"
            stickySectionHeadersEnabled={false}
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: theme.border }]} />
            )}
            renderSectionHeader={({ section }) => (
              <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
                <ThemedText type="smallBold" themeColor="primary" style={styles.sectionTitle}>
                  {section.title.toUpperCase()}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {section.data.length}
                </ThemedText>
              </View>
            )}
            ListEmptyComponent={
              locations.length > 0 ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                  {t('noResults')}
                </ThemedText>
              ) : undefined
            }
            renderItem={({ item }) => (
              <LocationRow
                location={item}
                isFavorite={isFavorite(item.globalIdLocal)}
                onPress={() =>
                  router.push({
                    pathname: '/location/[id]',
                    params: { id: String(item.globalIdLocal) },
                  })
                }
                onToggle={() => toggle(item.globalIdLocal)}
              />
            )}
            contentContainerStyle={styles.listContent}
          />
        </View>
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
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
  },
  search: {
    flex: 1,
    paddingVertical: Spacing.two + 2,
    fontSize: 16,
    lineHeight: 22,
  },
  listContent: {
    paddingBottom: Spacing.four,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  sectionTitle: {
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two + 2,
  },
  rowLabel: {
    flex: 1,
  },
  star: {
    paddingHorizontal: Spacing.one,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
