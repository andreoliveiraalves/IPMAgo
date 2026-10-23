import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

type Props = {
  visible: boolean;
  label?: string;
};

/**
 * Covers a screen while its first payload is being read/fetched.
 * It is intentionally opaque: when there is no cached data there is nothing
 * meaningful to show underneath, and the empty state must not flash first.
 */
export function LoadingOverlay({ visible, label }: Props) {
  const theme = useTheme();

  if (!visible) {
    return null;
  }

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      style={[styles.overlay, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.primary} />
      {label ? (
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    zIndex: 20,
  },
});
