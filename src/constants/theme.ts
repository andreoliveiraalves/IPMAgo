/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    textSecondary: '#60646C',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    border: '#D8D8D8',
    primary: '#007AFF',
    primarySoft: '#5AC8FA',
    accent: '#FF9500',
    danger: '#FF3B30',
    warning: '#FF9500',
    success: '#34C759',
    onPrimary: '#FFFFFF',
  },
  dark: {
    text: '#ffffff',
    textSecondary: '#B0B4BA',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    border: '#3A3A3C',
    primary: '#0A84FF',
    primarySoft: '#64D2FF',
    accent: '#FF9F0A',
    danger: '#FF453A',
    warning: '#FFD60A',
    success: '#30D158',
    onPrimary: '#FFFFFF',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Fire risk scale (PIR), from 1 (reduzido) to 5 (máximo). */
export const FireRiskColors = {
  1: '#2E7D5B',
  2: '#C9A227',
  3: '#D97706',
  4: '#C0392B',
  5: '#7B1E1E',
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
