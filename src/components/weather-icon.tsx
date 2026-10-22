import { StyleSheet, Text } from 'react-native';

import { weatherEmoji } from '@/lib/weather';

type Props = {
  weatherTypeId: number;
  size?: number;
  label?: string;
};

export function WeatherIcon({ weatherTypeId, size = 32, label }: Props) {
  return (
    <Text
      accessibilityLabel={label}
      accessibilityElementsHidden={!label}
      style={[styles.icon, { fontSize: size, lineHeight: size * 1.2 }]}>
      {weatherEmoji(weatherTypeId)}
    </Text>
  );
}

const styles = StyleSheet.create({
  icon: {
    textAlign: 'center',
  },
});
