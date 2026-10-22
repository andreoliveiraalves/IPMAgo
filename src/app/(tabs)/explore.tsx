import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { IpmaLocation } from '@/api/ipma/types';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useLocations } from '@/hooks/use-locations';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useFavorites } from '@/state/favorites';

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

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
        <ThemedText
          style={[
            styles.starGlyph,
            { color: isFavorite ? theme.text : theme.textSecondary },
          ]}>
          {isFavorite ? '★' : '☆'}
        </ThemedText>
      </Pressable>
    </Pressable>
  );
}

export default function ExploreScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useI18n();
  const { locations, isLoading, error, refresh } = useLocations();
  const { isFavorite, toggle } = useFavorites();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = normalize(query);

    if (!needle) {
      return locations;
    }

    return locations.filter((location) => normalize(location.local).includes(needle));
  }, [locations, query]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.inner}>
          <View style={styles.header}>
            <ThemedText type="subtitle">{t('tabLocations')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {filtered.length}
            </ThemedText>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor={theme.textSecondary}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            style={[
              styles.search,
              { backgroundColor: theme.backgroundElement, color: theme.text },
            ]}
          />

          {isLoading && locations.length === 0 ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary">
                {t('loading')}
              </ThemedText>
            </View>
          ) : null}

          {!isLoading && locations.length === 0 ? (
            <EmptyState
              emoji="📡"
              title={t('loadError')}
              description={error ?? t('noData')}
              actionLabel={t('retry')}
              onAction={() => {
                void refresh();
              }}
            />
          ) : null}

          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.globalIdLocal)}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: theme.backgroundElement }]} />
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
  search: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    lineHeight: 22,
  },
  listContent: {
    paddingBottom: Spacing.four,
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
  starGlyph: {
    fontSize: 22,
    lineHeight: 28,
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
