import type { ReactNode } from 'react';
import type { WidgetInfo, WidgetRepresentation } from 'react-native-android-widget';
import { FlexWidget, IconWidget, TextWidget } from 'react-native-android-widget';

import { Colors } from '@/constants/theme';
import type { Language, TranslationKey } from '@/i18n';
import { translations } from '@/i18n/translations';
import { describeAge, formatWeekdayShort, relativeDayKey } from '@/lib/dates';
import { formatRain, formatTemp } from '@/lib/forecast';
import { weatherGlyph } from '@/lib/weather';

import type { WidgetDay, WidgetSnapshot } from './snapshot';

/** Below this height (dp) the widget is the 4x2 layout, above it the 4x4 one. */
const COMPACT_HEIGHT = 200;

/** Bumped into the APK by the config plugin; see `app.json`. */
export const WIDGET_NAME = 'IpmaGoForecast';

/** Icon font bundled for the widget, so it reuses the app's glyph table. */
const ICON_FONT = 'MaterialCommunityIcons';

const APP_URI = 'ipmago://';

type Palette = typeof Colors.light | typeof Colors.dark;

export function buildWidgetTree(
  snapshot: WidgetSnapshot,
  info: WidgetInfo
): WidgetRepresentation {
  return {
    light: <IpmaWidget snapshot={snapshot} info={info} theme={Colors.light} />,
    dark: <IpmaWidget snapshot={snapshot} info={info} theme={Colors.dark} />,
  };
}

type Props = {
  snapshot: WidgetSnapshot;
  info: WidgetInfo;
  theme: Palette;
};

function IpmaWidget({ snapshot, info, theme }: Props) {
  const t = translator(snapshot.language);

  if (snapshot.globalIdLocal === null) {
    return (
      <Root theme={theme} clickAction="OPEN_APP">
        <FlexWidget
          style={{
            flex: 1,
            width: 'match_parent',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flexGap: 6,
          }}>
          <IconWidget
            icon="weather-partly-cloudy"
            size={28}
            font={ICON_FONT}
            style={{ color: theme.accent }}
          />
          <TextWidget
            text={t('widgetEmptyTitle')}
            style={{ fontSize: 15, fontWeight: 'bold', color: theme.text }}
          />
          <TextWidget
            text={t('widgetEmptyHint')}
            style={{ fontSize: 11, color: theme.textSecondary, textAlign: 'center' }}
            maxLines={2}
          />
        </FlexWidget>
      </Root>
    );
  }

  const uri = `${APP_URI}location/${snapshot.globalIdLocal}`;
  const compact = info.height < COMPACT_HEIGHT;
  const name = snapshot.name ?? t('appName');

  return (
    <Root theme={theme} clickAction="OPEN_URI" uri={uri}>
      <Header snapshot={snapshot} name={name} theme={theme} t={t} compact={compact} />
      {compact ? (
        <DaysStrip snapshot={snapshot} theme={theme} t={t} uri={uri} />
      ) : (
        <DaysList snapshot={snapshot} theme={theme} t={t} uri={uri} />
      )}
      {compact ? null : <UpdatedAt snapshot={snapshot} theme={theme} t={t} />}
    </Root>
  );
}

function Header({
  snapshot,
  name,
  theme,
  t,
  compact,
}: {
  snapshot: WidgetSnapshot;
  name: string;
  theme: Palette;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  compact: boolean;
}) {
  const glyph = weatherGlyph(snapshot.weatherTypeId ?? -99);

  return (
    <FlexWidget
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        width: 'match_parent',
        flexGap: 6,
      }}>
      <FlexWidget style={{ flex: 1, flexDirection: 'column', flexGap: 1 }}>
        <TextWidget
          text={name}
          style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}
          maxLines={1}
          truncate="END"
        />
        {compact ? null : (
          <TextWidget
            text={headerCaption(snapshot, t)}
            style={{ fontSize: 11, color: theme.textSecondary }}
            maxLines={1}
            truncate="END"
          />
        )}
      </FlexWidget>

      <IconWidget icon={glyph.name} size={22} font={ICON_FONT} style={{ color: theme.accent }} />

      {snapshot.maxTemp === null ? null : (
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 3 }}>
          <TextWidget
            text={formatTemp(snapshot.maxTemp)}
            style={{ fontSize: 18, fontWeight: 'bold', color: theme.text }}
          />
          {snapshot.minTemp === null ? null : (
            <TextWidget
              text={formatTemp(snapshot.minTemp)}
              style={{ fontSize: 13, color: theme.textSecondary }}
            />
          )}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

function headerCaption(
  snapshot: WidgetSnapshot,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
) {
  if (snapshot.maxTemp === null) {
    return t('noData');
  }

  const parts: string[] = [];

  if (snapshot.nowTemp !== null) {
    parts.push(`${t('now')} ${formatTemp(snapshot.nowTemp)}`);
  }

  if (snapshot.weatherLabel) {
    parts.push(snapshot.weatherLabel);
  }

  if (snapshot.rainProbability !== null) {
    parts.push(formatRain(snapshot.rainProbability));
  }

  return parts.join(' · ');
}

function DaysStrip({
  snapshot,
  theme,
  t,
  uri,
}: {
  snapshot: WidgetSnapshot;
  theme: Palette;
  t: (key: TranslationKey) => string;
  uri: string;
}) {
  return (
    <FlexWidget
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        width: 'match_parent',
        flexGap: 2,
      }}>
      {snapshot.days.map((day) => (
        <DayCell key={day.date} day={day} language={snapshot.language} theme={theme} t={t} uri={uri} />
      ))}
    </FlexWidget>
  );
}

function DayCell({
  day,
  language,
  theme,
  t,
  uri,
}: {
  day: WidgetDay;
  language: Language;
  theme: Palette;
  t: (key: TranslationKey) => string;
  uri: string;
}) {
  const glyph = weatherGlyph(day.weatherTypeId);

  return (
    <FlexWidget
      style={{
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flexGap: 1,
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: `${uri}/day/${day.date}` }}>
      <TextWidget
        text={dayLabel(day.date, language, t)}
        style={{ fontSize: 10, color: theme.textSecondary }}
        maxLines={1}
      />
      <IconWidget icon={glyph.name} size={17} font={ICON_FONT} style={{ color: theme.accent }} />
      <TextWidget
        text={formatTemp(day.maxTemp)}
        style={{ fontSize: 13, fontWeight: 'bold', color: theme.text }}
      />
      <TextWidget
        text={formatTemp(day.minTemp)}
        style={{ fontSize: 10, color: theme.textSecondary }}
      />
    </FlexWidget>
  );
}

function DaysList({
  snapshot,
  theme,
  t,
  uri,
}: {
  snapshot: WidgetSnapshot;
  theme: Palette;
  t: (key: TranslationKey) => string;
  uri: string;
}) {
  return (
    <FlexWidget
      style={{
        flex: 1,
        width: 'match_parent',
        flexDirection: 'column',
        marginTop: 8,
        marginBottom: 4,
      }}>
      {snapshot.days.map((day) => {
        const glyph = weatherGlyph(day.weatherTypeId);

        return (
          <FlexWidget
            key={day.date}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              width: 'match_parent',
              flexGap: 8,
            }}
            clickAction="OPEN_URI"
            clickActionData={{ uri: `${uri}/day/${day.date}` }}>
            <TextWidget
              text={dayLabel(day.date, snapshot.language, t)}
              style={{ fontSize: 13, color: theme.text, width: 46 }}
              maxLines={1}
            />
            <IconWidget icon={glyph.name} size={19} font={ICON_FONT} style={{ color: theme.accent }} />
            <FlexWidget style={{ flex: 1 }}>
              <TextWidget
                text={day.rainProbability === null ? '' : formatRain(day.rainProbability)}
                style={{ fontSize: 11, color: theme.primary }}
              />
            </FlexWidget>
            <TextWidget
              text={formatTemp(day.maxTemp)}
              style={{ fontSize: 14, fontWeight: 'bold', color: theme.text, width: 40, textAlign: 'right' }}
            />
            <TextWidget
              text={formatTemp(day.minTemp)}
              style={{ fontSize: 12, color: theme.textSecondary, width: 40, textAlign: 'right' }}
            />
          </FlexWidget>
        );
      })}
    </FlexWidget>
  );
}

function UpdatedAt({
  snapshot,
  theme,
  t,
}: {
  snapshot: WidgetSnapshot;
  theme: Palette;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}) {
  if (snapshot.fetchedAt === null) {
    return null;
  }

  const age = describeAge(snapshot.fetchedAt);
  const label =
    age.unit === 'now'
      ? t('updatedNow')
      : age.unit === 'minutes'
        ? t('updatedMinutes', { count: age.value })
        : t('updatedHours', { count: age.value });

  return (
    <TextWidget
      text={label}
      style={{ fontSize: 9, color: theme.textSecondary, width: 'match_parent' }}
      maxLines={1}
    />
  );
}

function dayLabel(
  date: string,
  language: Language,
  t: (key: TranslationKey) => string
): string {
  const relative = relativeDayKey(date);

  if (relative === 'today') {
    return t('today');
  }

  return formatWeekdayShort(date, language);
}

function Root({
  children,
  theme,
  clickAction,
  uri,
}: {
  children: ReactNode;
  theme: Palette;
  clickAction: 'OPEN_APP' | 'OPEN_URI';
  uri?: string;
}) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: theme.background,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.border,
        padding: 12,
      }}
      clickAction={clickAction}
      clickActionData={uri ? { uri } : undefined}>
      {children}
    </FlexWidget>
  );
}

function translator(language: Language) {
  const dictionary = translations[language];

  return (key: TranslationKey, params?: Record<string, string | number>) => {
    const template = dictionary[key];

    if (!params) {
      return template;
    }

    return template.replace(/\{(\w+)\}/g, (match: string, name: string) =>
      name in params ? String(params[name]) : match
    );
  };
}
