import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useBlurOnRouteChange } from '@/hooks/use-blur-on-route-change';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useWidgetSync } from '@/hooks/use-widget-sync';
import { I18nProvider } from '@/i18n';
import { FavoritesProvider } from '@/state/favorites';
import { ReferenceDataProvider } from '@/state/reference-data';

SplashScreen.preventAutoHideAsync();

/** Keeps the home-screen widget on the same favorite and language as the app. */
function WidgetSync() {
  useWidgetSync();

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useBlurOnRouteChange();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <I18nProvider>
        <FavoritesProvider>
          <ReferenceDataProvider>
            <AnimatedSplashOverlay />
            <WidgetSync />
            <StatusBar style="auto" />
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="location/[id]"
                options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal', title: '' }}
              />
              <Stack.Screen
                name="location/[id]/day/[date]"
                options={{ presentation: 'modal', title: '' }}
              />
            </Stack>
          </ReferenceDataProvider>
        </FavoritesProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
