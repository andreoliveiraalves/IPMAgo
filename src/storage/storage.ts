import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'ipmago';

export const storageKeys = {
  favorites: `${PREFIX}:favorites:v1`,
  language: `${PREFIX}:language:v1`,
  /** v2: the list grew from 35 to 423 locations. */
  locations: `${PREFIX}:locations:v2`,
  reference: `${PREFIX}:reference:v1`,
  /** v3: bundles now contain up to 10 forecast days. */
  forecast: (globalIdLocal: number) => `${PREFIX}:forecast:v3:${globalIdLocal}`,
  /** Bulk hazard files are cached per calendar day. */
  fireRisk: (date: string) => `${PREFIX}:fire-risk:v1:${date}`,
  sea: (date: string) => `${PREFIX}:sea:v1:${date}`,
};

/**
 * Storage failures must never break the UI: everything degrades to "no cache".
 */
export async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function writeJson<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignored on purpose: cached data is a convenience, not a requirement.
  }
}

export async function removeJson(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // Ignored on purpose.
  }
}
