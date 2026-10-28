import type { WidgetInfo, WidgetRepresentation } from 'react-native-android-widget';

import { buildWidgetTree, WIDGET_NAME } from './ipma-widget';
import { emptySnapshot, readWidgetSnapshot } from './snapshot';

/**
 * Builds the widget tree for one placed widget.
 *
 * Data failures must never surface as an error card: a missing snapshot falls
 * back to the "pick a favorite" state, which is still a valid widget.
 */
export async function renderWidgetRepresentation(info: WidgetInfo): Promise<WidgetRepresentation> {
  try {
    const snapshot = await readWidgetSnapshot();

    return buildWidgetTree(snapshot, info);
  } catch {
    return buildWidgetTree(emptySnapshot('pt'), info);
  }
}

export { WIDGET_NAME };
