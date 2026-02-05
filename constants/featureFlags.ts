// constants/featureFlags.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export const FeatureFlags = {
  // Home
  HOME_V2: "HOME_V2",
  HOME_TELEMETRY: "HOME_TELEMETRY",
  HOME_SEARCH_DEBOUNCE_V1: "HOME_SEARCH_DEBOUNCE_V1",
  HOME_PERSIST_FILTERS_V1: "HOME_PERSIST_FILTERS_V1",

  // Checkout
  CHECKOUT_V1: "CHECKOUT_V1",

  // Analytics
  ANALYTICS_EVENTS: "ANALYTICS_EVENTS",
} as const;

export type FeatureFlagKey = (typeof FeatureFlags)[keyof typeof FeatureFlags];

const STORAGE_KEY = "plugaishop.featureFlags.v1";

/**
 * Defaults do app (sem depender de storage).
 * Se quiser desligar alguma coisa por padrão, altere aqui.
 */
const DEFAULT_FLAGS: Record<FeatureFlagKey, boolean> = {
  HOME_V2: true,
  HOME_TELEMETRY: true,
  HOME_SEARCH_DEBOUNCE_V1: true,
  HOME_PERSIST_FILTERS_V1: true,
  CHECKOUT_V1: true,
  ANALYTICS_EVENTS: true,
};

let cache: Record<FeatureFlagKey, boolean> | null = null;

function sanitize(input: unknown): Record<FeatureFlagKey, boolean> {
  const out: Record<FeatureFlagKey, boolean> = { ...DEFAULT_FLAGS };

  if (!input || typeof input !== "object") return out;

  for (const key of Object.keys(DEFAULT_FLAGS) as FeatureFlagKey[]) {
    const v = (input as any)[key];
    if (typeof v === "boolean") out[key] = v;
  }
  return out;
}

async function loadOnce(): Promise<Record<FeatureFlagKey, boolean>> {
  if (cache) return cache;

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cache = { ...DEFAULT_FLAGS };
      return cache;
    }

    const parsed = JSON.parse(raw) as unknown;
    cache = sanitize(parsed);
    return cache;
  } catch {
    cache = { ...DEFAULT_FLAGS };
    return cache;
  }
}

/**
 * Retorna snapshot das flags (útil pra debug/diagnóstico).
 */
export async function getFeatureFlags(): Promise<Record<FeatureFlagKey, boolean>> {
  return loadOnce();
}

/**
 * Getter unitário de flag.
 */
export async function getFeatureFlag(flag: FeatureFlagKey): Promise<boolean> {
  const flags = await loadOnce();
  return Boolean(flags[flag]);
}

/**
 * (Opcional) Setter pra debug interno.
 * Não é usado pelas telas, mas ajuda quando você quiser ligar/desligar sem rebuild.
 */
export async function setFeatureFlags(partial: Partial<Record<FeatureFlagKey, boolean>>): Promise<void> {
  const current = await loadOnce();
  const next = sanitize({ ...current, ...partial });
  cache = next;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}
