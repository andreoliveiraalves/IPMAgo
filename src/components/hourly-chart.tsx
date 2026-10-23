import { useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  type GestureResponderEvent,
  type HostInstance,
  type LayoutChangeEvent,
  type PointerEvent,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import type { HourlyForecast } from '@/api/ipma/types';
import { ThemedText } from '@/components/themed-text';
import { WeatherIcon } from '@/components/weather-icon';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { toIsoDate } from '@/lib/dates';
import {
  formatHour,
  formatRain,
  formatTemp,
  localDateKey,
  parseNaiveUtc,
} from '@/lib/forecast';
import { useReferenceData } from '@/state/reference-data';

const CHART_HEIGHT = 148;
const PAD_LEFT = 14;
const PAD_RIGHT = 14;
const PAD_TOP = 18;
const PAD_BOTTOM = 26;
/** Max height of the rain-probability bars, as a share of the plot height. */
const RAIN_BAR_HEIGHT_RATIO = 0.55;

type Props = {
  hours: HourlyForecast[];
  date: string;
};

/** Index of the entry closest to `targetHour`, used as the initial selection. */
function nearestHourIndex(hours: HourlyForecast[], targetHour: number): number {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  hours.forEach((hour, index) => {
    const distance = Math.abs(parseNaiveUtc(hour.time).getHours() - targetHour);
    if (distance < bestDistance) {
      bestIndex = index;
      bestDistance = distance;
    }
  });

  return bestIndex;
}

/**
 * IPMA publishes the hourly rain probability only every 3 hours (`-99` becomes
 * `null` on the other hours). Use the nearest published value so the readout
 * does not show an empty metric for two out of every three hours.
 */
function rainProbabilityAt(hours: HourlyForecast[], index: number): number | null {
  const exact = hours[index]?.rainProbability;
  if (exact != null) {
    return exact;
  }

  for (let offset = 1; offset < hours.length; offset += 1) {
    const before = hours[index - offset]?.rainProbability;
    if (before != null) {
      return before;
    }

    const after = hours[index + offset]?.rainProbability;
    if (after != null) {
      return after;
    }
  }

  return null;
}

/**
 * Full-width temperature chart for one day. Dragging horizontally moves a
 * cursor across the curve; the readout above the chart follows the cursor and
 * shows the weather, temperature and rain probability for that hour. This
 * replaces the old horizontally scrolling row of hour cards.
 */
export function HourlyChart({ hours, date }: Props) {
  const theme = useTheme();
  const { t } = useI18n();
  const { weatherLabel } = useReferenceData();

  // Keep the latest hours in a ref so gesture handlers always read the current
  // list without being recreated on every render.
  const hoursRef = useRef(hours);
  useEffect(() => {
    hoursRef.current = hours;
  }, [hours]);

  const hoursSignature = hours.map((hour) => hour.time).join('|');

  const [selected, setSelected] = useState(() => nearestHourIndex(hours, 13));
  const [width, setWidth] = useState(0);

  // Once mounted, start on the current hour for today (kept out of the initial
  // render so server and first client render stay deterministic).
  useEffect(() => {
    const now = new Date();
    if (date === toIsoDate(now)) {
      setSelected(nearestHourIndex(hoursRef.current, now.getHours()));
    }
  }, [date, hoursSignature]);

  const chartRef = useRef<HostInstance>(null);
  const originRef = useRef(0);
  const widthRef = useRef(0);
  const gestureStartRef = useRef({ x: 0, y: 0, active: false });

  const activeIndex = Math.min(Math.max(selected, 0), Math.max(hours.length - 1, 0));
  const active = hours[activeIndex];

  const selectFromPageX = (pageX: number) => {
    const chartWidth = widthRef.current;
    const count = hoursRef.current.length;

    if (!chartWidth || count === 0) {
      return;
    }

    const plotWidth = Math.max(chartWidth - PAD_LEFT - PAD_RIGHT, 1);
    const localX = Math.min(Math.max(pageX - originRef.current - PAD_LEFT, 0), plotWidth);
    const index = count === 1 ? 0 : Math.round((localX / plotWidth) * (count - 1));

    setSelected(index);
  };

  // Record the touch origin without claiming the gesture: taps are handled by
  // onPointerDown and vertical drags scroll the page. The parent only becomes
  // the responder once the drag is clearly horizontal.
  const handleStartCapture = (event: GestureResponderEvent) => {
    gestureStartRef.current = {
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
      active: true,
    };

    return false;
  };

  const handleMoveShouldSet = (event: GestureResponderEvent) => {
    const start = gestureStartRef.current;

    if (!start.active) {
      return false;
    }

    const dx = event.nativeEvent.pageX - start.x;
    const dy = event.nativeEvent.pageY - start.y;

    return Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy) * 1.5;
  };

  const handleResponderGrant = (event: GestureResponderEvent) => {
    const pageX = event.nativeEvent.pageX;

    chartRef.current?.measureInWindow((x) => {
      originRef.current = x;
      selectFromPageX(pageX);
    });
  };

  const handleResponderMove = (event: GestureResponderEvent) => {
    selectFromPageX(event.nativeEvent.pageX);
  };

  // Selection for taps/clicks. Pointer events do not claim the responder, so
  // vertical scrolling still works when the gesture starts on the chart.
  const handlePointerDown = (event: PointerEvent) => {
    selectFromPageX(event.nativeEvent.pageX);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    widthRef.current = nextWidth;
    setWidth(nextWidth);
    chartRef.current?.measureInWindow((x) => {
      originRef.current = x;
    });
  };

  const geometry = useMemo(() => {
    const plotWidth = Math.max(width - PAD_LEFT - PAD_RIGHT, 0);
    const plotHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
    const bottom = PAD_TOP + plotHeight;

    if (hours.length === 0) {
      return { points: [], line: '', area: '', plotHeight, bottom, ticks: [], rainBars: [] };
    }

    const temps = hours.map((hour) => hour.temp);
    const rawMin = Math.min(...temps);
    const rawMax = Math.max(...temps);
    const span = Math.max(rawMax - rawMin, 1);
    const lo = rawMin - span * 0.25;
    const hi = rawMax + span * 0.25;
    const range = hi - lo;

    const points = hours.map((hour, index) => {
      const x =
        hours.length === 1
          ? PAD_LEFT + plotWidth / 2
          : PAD_LEFT + (index / (hours.length - 1)) * plotWidth;
      const y = PAD_TOP + ((hi - hour.temp) / range) * plotHeight;

      return { x, y };
    });

    const line = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(' ');
    const last = points[points.length - 1];
    const first = points[0];
    const area = `${line} L ${last.x.toFixed(2)} ${bottom} L ${first.x.toFixed(2)} ${bottom} Z`;

    const tickStep = hours.length > 16 ? 3 : hours.length > 10 ? 2 : 1;
    const ticks = hours
      .map((hour, index) => ({ index, label: formatHour(hour.time) }))
      .filter(({ index }) => index % tickStep === 0);

    const spacing = hours.length > 1 ? plotWidth / (hours.length - 1) : plotWidth;
    const barWidth = Math.max(Math.min(spacing * 0.45, 16), 3);
    const rainBars = points
      .map((point, index) => {
        const rain = rainProbabilityAt(hours, index) ?? 0;
        if (rain <= 0) {
          return null;
        }

        const height = Math.max(
          (rain / 100) * plotHeight * RAIN_BAR_HEIGHT_RATIO,
          3
        );

        return {
          key: hours[index].time,
          x: point.x - barWidth / 2,
          y: bottom - height,
          width: barWidth,
          height,
        };
      })
      .filter(
        (
          bar
        ): bar is {
          key: string;
          x: number;
          y: number;
          width: number;
          height: number;
        } => bar !== null
      );

    return { points, line, area, plotHeight, bottom, ticks, rainBars };
  }, [hours, width]);

  if (!active) {
    return null;
  }

  const activeLabel = weatherLabel(active.weatherTypeId);
  const activeRain = rainProbabilityAt(hours, activeIndex);
  const activePoint = geometry.points[activeIndex];
  const activeIsNextDay = localDateKey(active.time) !== date;
  const activeTimeLabel = activeIsNextDay
    ? `${t('tomorrow')} · ${formatHour(active.time)}`
    : formatHour(active.time);

  return (
    <View style={styles.container}>
      <View style={styles.readout}>
        <View style={styles.readoutMain}>
          <ThemedText type="smallBold">{activeTimeLabel}</ThemedText>
          <WeatherIcon
            weatherTypeId={active.weatherTypeId}
            size={22}
            label={activeLabel}
          />
        </View>

        <View style={styles.readoutValues}>
          <ThemedText type="smallBold" themeColor="primary" style={styles.readoutTemp}>
            {formatTemp(active.temp)}
          </ThemedText>
          <View style={styles.readoutMetric}>
            <View style={styles.rainLabel}>
              <View style={[styles.rainSwatch, { backgroundColor: theme.primarySoft }]} />
              <ThemedText type="small" themeColor="textSecondary">
                {t('rain')}
              </ThemedText>
            </View>
            <ThemedText type="smallBold">{formatRain(activeRain)}</ThemedText>
          </View>
        </View>
      </View>

      <View
        ref={chartRef}
        onLayout={handleLayout}
        style={styles.chart}
        onStartShouldSetResponderCapture={handleStartCapture}
        onMoveShouldSetResponderCapture={handleMoveShouldSet}
        onMoveShouldSetResponder={handleMoveShouldSet}
        onResponderGrant={handleResponderGrant}
        onResponderMove={handleResponderMove}
        onResponderTerminationRequest={() => false}
        onPointerDown={handlePointerDown}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={t('hourlyTemperature')}
        accessibilityValue={{
          text: `${activeTimeLabel}, ${formatTemp(active.temp)}, ${activeLabel}, ${formatRain(
            activeRain
          )}`,
        }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') {
            setSelected(Math.min(activeIndex + 1, hours.length - 1));
          } else if (event.nativeEvent.actionName === 'decrement') {
            setSelected(Math.max(activeIndex - 1, 0));
          }
        }}>
        {width > 0 ? (
          <Svg width={width} height={CHART_HEIGHT}>
            <Defs>
              <LinearGradient id="hourlyTempFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={theme.primary} stopOpacity={0.28} />
                <Stop offset="1" stopColor={theme.primary} stopOpacity={0} />
              </LinearGradient>
            </Defs>

            {[0.25, 0.5, 0.75].map((ratio) => (
              <Line
                key={ratio}
                x1={PAD_LEFT}
                x2={width - PAD_RIGHT}
                y1={PAD_TOP + geometry.plotHeight * ratio}
                y2={PAD_TOP + geometry.plotHeight * ratio}
                stroke={theme.border}
                strokeWidth={1}
                strokeDasharray="3 5"
              />
            ))}

            <Path d={geometry.area} fill="url(#hourlyTempFill)" />

            {geometry.rainBars.map((bar) => (
              <Rect
                key={`rain-${bar.key}`}
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={bar.height}
                rx={bar.width / 2}
                fill={theme.primarySoft}
                opacity={0.8}
              />
            ))}

            <Path
              d={geometry.line}
              fill="none"
              stroke={theme.primary}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {geometry.points.map((point, index) => (
              <Circle
                key={hours[index].time}
                cx={point.x}
                cy={point.y}
                r={2.5}
                fill={theme.primary}
                opacity={0.9}
              />
            ))}

            {geometry.ticks.map(({ index, label }) => (
              <SvgText
                key={hours[index].time}
                x={geometry.points[index].x}
                y={CHART_HEIGHT - 8}
                fill={theme.textSecondary}
                fontSize={10}
                fontWeight="600"
                textAnchor="middle">
                {label}
              </SvgText>
            ))}

            {activePoint ? (
              <>
                <Line
                  x1={activePoint.x}
                  x2={activePoint.x}
                  y1={PAD_TOP}
                  y2={geometry.bottom}
                  stroke={theme.textSecondary}
                  strokeWidth={1}
                  strokeDasharray="3 4"
                  opacity={0.7}
                />
                <Circle cx={activePoint.x} cy={activePoint.y} r={8} fill={theme.background} />
                <Circle cx={activePoint.x} cy={activePoint.y} r={5} fill={theme.primary} />
              </>
            ) : null}
          </Svg>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  readout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    minHeight: 34,
  },
  readoutMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  readoutValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  readoutTemp: {
    fontSize: 26,
    lineHeight: 30,
  },
  readoutMetric: {
    alignItems: 'flex-end',
  },
  rainLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  rainSwatch: {
    width: 6,
    height: 6,
    borderRadius: 2,
  },
  chart: {
    width: '100%',
    height: CHART_HEIGHT,
  },
});
