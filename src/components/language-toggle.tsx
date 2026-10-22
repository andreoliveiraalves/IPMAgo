import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { useTheme } from '@/hooks/use-theme';

const OPTIONS = ['pt', 'en'] as const;

export function LanguageToggle() {
  const { language, setLanguage, t } = useI18n();
  const theme = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('language')}
      style={[styles.container, { backgroundColor: theme.backgroundElement }]}>
      {OPTIONS.map((option) => {
        const selected = language === option;

        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option === 'pt' ? 'Português' : 'English'}
            onPress={() => setLanguage(option)}
            style={[styles.option, selected && { backgroundColor: theme.backgroundSelected }]}>
            <Text
              style={[
                styles.label,
                { color: selected ? theme.text : theme.textSecondary },
                selected && styles.labelSelected,
              ]}>
              {option.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 2,
    gap: 2,
  },
  option: {
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  labelSelected: {
    fontWeight: '700',
  },
});
