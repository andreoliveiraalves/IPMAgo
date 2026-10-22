import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppIcons, type AppIconName } from '@/lib/weather';

import { AppIcon } from './app-icon';

type Props = {
  title: string;
  description: string;
  icon?: AppIconName;
  iconColor?: ThemeColor;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  title,
  description,
  icon = AppIcons.locationOff,
  iconColor = 'primary',
  actionLabel,
  onAction,
}: Props) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <AppIcon name={icon} size={40} themeColor={iconColor} />
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.description, { color: theme.textSecondary }]}>{description}</Text>

      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [
            styles.action,
            { backgroundColor: theme.primary },
            pressed && styles.pressed,
          ]}>
          <Text style={[styles.actionLabel, { color: theme.onPrimary }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    gap: Spacing.two,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  action: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  actionLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
