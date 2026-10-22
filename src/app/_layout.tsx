import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  type Theme,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors } from '@/constants/theme';
import { I18nProvider } from '@/i18n';
import { FavoritesProvider } from '@/state/favorites';
import { ReferenceDataProvider } from '@/state/reference-data';

SplashScreen.preventAutoHideAsync();

const LightTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.primary,
    background: Colors.light.background,
    card: Colors.light.background,
    text: Colors.light.text,
    border: Colors.light.border,
    notification: Colors.light.accent,
  },
};

const DarkThemeAzulejo: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.primary,
    background: Colors.dark.background,
    card: Colors.dark.background,
    text: Colors.dark.text,
    border: Colors.dark.border,
    notification: Colors.dark.accent,
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const navColors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkThemeAzulejo : LightTheme}>
      <I18nProvider>
        <FavoritesProvider>
          <ReferenceDataProvider>
            <AnimatedSplashOverlay />
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerTintColor: navColors.primary }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="location/[id]"
                options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal' }}
              />
              <Stack.Screen name="location/[id]/day/[date]" options={{ presentation: 'modal' }} />
            </Stack>
          </ReferenceDataProvider>
        </FavoritesProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
