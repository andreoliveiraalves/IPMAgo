/**
 * Azulejo palette: cobalt tile blue, warm white, sand and terracotta.
 * The same tokens are used by every component so light/dark mode stays coherent.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0F2A43',
    textSecondary: '#5B7085',
    background: '#F7F5F0',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E8EEF5',
    border: '#D9E2EC',
    primary: '#1B4F9C',
    primarySoft: '#4A7FC1',
    accent: '#C4622D',
    danger: '#B3261E',
    warning: '#B26B00',
    success: '#2E7D5B',
    onPrimary: '#FFFFFF',
  },
  dark: {
    text: '#F3F6F9',
    textSecondary: '#A5B8C9',
    background: '#0A1622',
    backgroundElement: '#122436',
    backgroundSelected: '#1B3147',
    border: '#24405A',
    primary: '#5C93D6',
    primarySoft: '#8AB4E4',
    accent: '#E08A57',
    danger: '#F2B8B5',
    warning: '#F5C26B',
    success: '#7DD3A8',
    onPrimary: '#0A1622',
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

export const Brand = {
  navy: '#0F2A43',
  cobalt: '#1B4F9C',
  tile: '#E8EEF5',
  terracotta: '#C4622D',
  sun: '#E8873A',
  sky: '#4A7FC1',
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
