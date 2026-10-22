import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useTheme } from '@/hooks/use-theme';
import { weatherGlyph, weatherToneColor } from '@/lib/weather';

type Props = {
  weatherTypeId: number;
  size?: number;
  label?: string;
  color?: string;
};

export function WeatherIcon({ weatherTypeId, size = 32, label, color }: Props) {
  const theme = useTheme();
  const glyph = weatherGlyph(weatherTypeId);

  return (
    <MaterialCommunityIcons
      name={glyph.name}
      size={size}
      color={color ?? theme[weatherToneColor(glyph.tone)]}
      accessibilityLabel={label}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
    />
  );
}
