import { Platform } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { buildWidgetTree } from './ipma-widget';
import { renderWidgetRepresentation } from './render';
import { emptySnapshot } from './snapshot';

/**
 * Registers the Android widget task handler.
 *
 * Loaded from the app entry (`index.js`) rather than a screen, because Android
 * starts the JS runtime in a headless context for scheduled updates, before any
 * route exists. The 30 s headless budget is why `readWidgetSnapshot` renders
 * from cache first and only then revalidates.
 */
if (Platform.OS === 'android') {
  registerWidgetTaskHandler(async ({ widgetAction, widgetInfo, renderWidget }) => {
    if (widgetAction === 'WIDGET_DELETED' || widgetAction === 'WIDGET_CLICK') {
      return;
    }

    try {
      renderWidget(await renderWidgetRepresentation(widgetInfo));
    } catch {
      renderWidget(buildWidgetTree(emptySnapshot('pt'), widgetInfo));
    }
  });
}
