import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { AppIconName } from '@/lib/weather';

type Props = {
  name: AppIconName;
  size?: number;
  themeColor?: ThemeColor;
  color?: string;
  label?: string;
};

export function AppIcon({ name, size = 20, themeColor = 'textSecondary', color, label }: Props) {
  const theme = useTheme();

  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={color ?? theme[themeColor]}
      accessibilityLabel={label}
      accessibilityElementsHidden={!label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
    />
  );
}
