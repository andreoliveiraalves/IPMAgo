import type { FireRiskBundle, FireRiskDay, IpmaLocation } from '@/api/ipma/types';
import { FireRiskColors } from '@/constants/theme';
import type { TranslationKey } from '@/i18n';

export type FireRiskLevel = 1 | 2 | 3 | 4 | 5;

const FIRE_RISK_LABELS: Record<FireRiskLevel, TranslationKey> = {
  1: 'fireRisk1',
  2: 'fireRisk2',
  3: 'fireRisk3',
  4: 'fireRisk4',
  5: 'fireRisk5',
};

/** IPMA location -> official municipality code used by the fire-risk maps. */
export function municipalityCode(location: IpmaLocation): string {
  return `${String(location.idDistrito).padStart(2, '0')}${String(location.idConcelho).padStart(2, '0')}`;
}

export function fireRiskLevel(level: number | undefined): FireRiskLevel | null {
  return level === 1 || level === 2 || level === 3 || level === 4 || level === 5 ? level : null;
}

export function fireRiskLabelKey(level: FireRiskLevel): TranslationKey {
  return FIRE_RISK_LABELS[level];
}

export function fireRiskColor(level: FireRiskLevel): string {
  return FireRiskColors[level];
}

/** Risk for a specific location/day, or null when IPMA has no data (islands, days 4-5). */
export function fireRiskFor(
  bundle: FireRiskBundle | null,
  location: IpmaLocation | null,
  date: string
): FireRiskLevel | null {
  if (!bundle || !location) {
    return null;
  }

  const day: FireRiskDay | undefined = bundle.days.find((item) => item.date === date);
  if (!day) {
    return null;
  }

  return fireRiskLevel(day.levels[municipalityCode(location)]);
}
