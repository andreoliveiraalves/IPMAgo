import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { useI18n } from '@/i18n';
import { useFavorites } from '@/state/favorites';
import { renderWidgetRepresentation, WIDGET_NAME } from '@/widgets/render';

const isAndroid = Platform.OS === 'android';

async function pushWidgetUpdate(): Promise<void> {
  if (!isAndroid) {
    return;
  }

  try {
    await requestWidgetUpdate({
      widgetName: WIDGET_NAME,
      renderWidget: (info) => renderWidgetRepresentation(info),
    });
  } catch {
    // No widget on the home screen yet, or the native module is unavailable.
  }
}

/**
 * Pushes the current favorite and language into the home-screen widget.
 *
 * Reordering favorites is how the user chooses the widget's location, so the
 * move has to land on the home screen immediately instead of waiting for the
 * next 30-minute periodic update.
 */
export function useWidgetSync(): void {
  const { ids, ready } = useFavorites();
  const { language } = useI18n();
  const key = ids.join(',');

  useEffect(() => {
    if (!ready) {
      return;
    }

    void pushWidgetUpdate();
  }, [ready, key, language]);

  useEffect(() => {
    if (!isAndroid) {
      return;
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void pushWidgetUpdate();
      }
    });

    return () => subscription.remove();
  }, []);
}
