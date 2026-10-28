import { useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import type { MarineHour } from '@/api/marine';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatHour, parseNaiveUtc } from '@/lib/forecast';
import type { TideEvent } from '@/lib/tide';

const CHART_HEIGHT = 112;
const PAD_X = 10;
const PAD_TOP = 22;
const PAD_BOTTOM = 30;

type Props = {
  /** Samples belonging to the selected day. */
  hours: MarineHour[];
  events: TideEvent[];
};

/**
 * 24 h sea-level curve with the high/low tides marked. Heights are shown
 * relative to the model datum, so only times are labelled — the values are not
 * comparable to the official Hydrographic Institute tables.
 */
export function TideChart({ hours, events }: Props) {
  const theme = useTheme();
  const { t } = useI18n();
  const [width, setWidth] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  const geometry = useMemo(() => {
    const samples = hours
      .map((hour) => ({
        time: parseNaiveUtc(hour.time).getTime(),
        height: hour.seaLevel,
      }))
      .filter(
        (sample): sample is { time: number; height: number } => sample.height !== null
      );

    if (samples.length < 2 || width === 0) {
      return null;
    }

    const plotWidth = Math.max(width - PAD_X * 2, 0);
    const plotHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
    const first = samples[0].time;
    const last = samples[samples.length - 1].time;
    const span = Math.max(last - first, 1);

    const heights = samples.map((sample) => sample.height);
    const min = Math.min(...heights);
    const max = Math.max(...heights);
    const range = Math.max(max - min, 0.1);

    const xFor = (instant: number) => PAD_X + ((instant - first) / span) * plotWidth;
    const yFor = (height: number) => PAD_TOP + ((max - height) / range) * plotHeight;

    const points = samples.map((sample) => ({
      x: xFor(sample.time),
      y: yFor(sample.height),
    }));

    const line = points
      .map(
        (point, index) =>
          `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
      )
      .join(' ');
    const area = `${line} L ${points[points.length - 1].x.toFixed(2)} ${
      CHART_HEIGHT - PAD_BOTTOM
    } L ${points[0].x.toFixed(2)} ${CHART_HEIGHT - PAD_BOTTOM} Z`;

    // One tick every six hours, aligned with the labels shown below the curve.
    const ticks = samples
      .map((sample) => {
        const iso = new Date(sample.time).toISOString();
        const label = formatHour(iso);

        return { key: sample.time, x: xFor(sample.time), label };
      })
      .filter((tick) => Number(tick.label.slice(0, 2)) % 6 === 0);

    const markers = events
      .filter((event) => event.time.getTime() >= first && event.time.getTime() <= last)
      .map((event) => {
        const x = xFor(event.time.getTime());
        const y = yFor(event.height);

        return {
          key: `${event.kind}-${event.time.getTime()}`,
          kind: event.kind,
          x,
          y,
          // High labels sit above the curve, low labels below it.
          labelY:
            event.kind === 'high'
              ? Math.max(y - 8, 9)
              : Math.min(y + 13, CHART_HEIGHT - 18),
          label: formatHour(event.time.toISOString()),
        };
      });

    return { line, area, ticks, markers };
  }, [events, hours, width]);

  const summary = events
    .map(
      (event) =>
        `${event.kind === 'high' ? t('highTide') : t('lowTide')} ${formatHour(
          event.time.toISOString()
        )}`
    )
    .join(', ');

  return (
    <View
      style={styles.chart}
      onLayout={handleLayout}
      accessible
      accessibilityRole="image"
      accessibilityLabel={summary ? `${t('tide')}: ${summary}` : t('tide')}>
      {geometry ? (
        <Svg width={width} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="tideFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={theme.primary} stopOpacity={0.26} />
              <Stop offset="1" stopColor={theme.primary} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          <Path d={geometry.area} fill="url(#tideFill)" />
          <Path
            d={geometry.line}
            fill="none"
            stroke={theme.primary}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {geometry.ticks.map((tick) => (
            <SvgText
              key={tick.key}
              x={tick.x}
              y={CHART_HEIGHT - 5}
              fill={theme.textSecondary}
              fontSize={9}
              fontWeight="600"
              textAnchor="middle">
              {tick.label}
            </SvgText>
          ))}

          {geometry.markers.map((marker) => (
            <G key={marker.key}>
              <Circle cx={marker.x} cy={marker.y} r={3} fill={theme.primary} />
              <SvgText
                x={Math.min(Math.max(marker.x, PAD_X + 12), width - PAD_X - 12)}
                y={marker.labelY}
                fill={theme.textSecondary}
                fontSize={9}
                fontWeight="700"
                textAnchor="middle">
                {marker.label}
              </SvgText>
            </G>
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    width: '100%',
    height: CHART_HEIGHT,
    marginTop: Spacing.one,
  },
});
