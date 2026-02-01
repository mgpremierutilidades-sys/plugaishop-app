import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Feature Flags
 * - Persistência via AsyncStorage para permitir ligar/desligar sem mexer no código.
 * - Cache em memória para performance.
 */

export const FeatureFlags = {
  ANALYTICS_EVENTS: "FF_ANALYTICS_EVENTS",

  HOME_EVENTS_V1: "FF_HOME_EVENTS_V1",
  HOME_EVENTS_V2: "FF_HOME_EVENTS_V2",
  HOME_EVENTS_V3: "FF_HOME_EVENTS_V3",

  HOME_SEARCH_DEBOUNCE_V1: "FF_HOME_SEARCH_DEBOUNCE_V1",
  HOME_PERSIST_FILTERS_V1: "FF_HOME_PERSIST_FILTERS_V1",

  TTI_V1: "FF_TTI_V1",
} as const;

export type FeatureFlagKey = (typeof FeatureFlags)[keyof typeof FeatureFlags];

const STORAGE_PREFIX = "ff:";
const DEFAULT_FLAGS: Record<FeatureFlagKey, boolean> = {
  [FeatureFlags.ANALYTICS_EVENTS]: false,

  // Home events (telemetria)
  [FeatureFlags.HOME_EVENTS_V1]: false,
  [FeatureFlags.HOME_EVENTS_V2]: false,
  [FeatureFlags.HOME_EVENTS_V3]: true,

  // Home perf/state (invisível)
  [FeatureFlags.HOME_SEARCH_DEBOUNCE_V1]: true,
  [FeatureFlags.HOME_PERSIST_FILTERS_V1]: true,

  [FeatureFlags.TTI_V1]: false,
};

const cache: Partial<Record<FeatureFlagKey, boolean>> = {};

export async function getFeatureFlag(key: FeatureFlagKey): Promise<boolean> {
  if (key in cache) return Boolean(cache[key]);

  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (raw === null) {
      cache[key] = DEFAULT_FLAGS[key];
      return DEFAULT_FLAGS[key];
    }
    const parsed = raw === "true";
    cache[key] = parsed;
    return parsed;
  } catch {
    cache[key] = DEFAULT_FLAGS[key];
    return DEFAULT_FLAGS[key];
  }
}

export async function setFeatureFlag(key: FeatureFlagKey, value: boolean): Promise<void> {
  cache[key] = value;
  try {
    await AsyncStorage.setItem(`${STORAGE_PREFIX}${key}`, value ? "true" : "false");
  } catch {
    // Se falhar, ainda fica em cache nesta sessão.
  }
}

export function getFeatureFlagDefault(key: FeatureFlagKey): boolean {
  return DEFAULT_FLAGS[key];
}
