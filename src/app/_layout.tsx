import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { I18nProvider } from '@/i18n';
import { FavoritesProvider } from '@/state/favorites';
import { ReferenceDataProvider } from '@/state/reference-data';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <I18nProvider>
        <FavoritesProvider>
          <ReferenceDataProvider>
            <AnimatedSplashOverlay />
            <StatusBar style="auto" />
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="location/[id]"
                options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal' }}
              />
            </Stack>
          </ReferenceDataProvider>
        </FavoritesProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
