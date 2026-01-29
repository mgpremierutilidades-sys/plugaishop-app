// constants/flags.ts
/**
 * Feature flags
 *
 * Convenções:
 * - Flags de experimento/risco: default OFF (habilite via EXPO_PUBLIC_*=1)
 * - Flags de correção crítica (bugfix): default ON (desabilite via EXPO_PUBLIC_*=0)
 *
 * Env vars (Expo public):
 * - EXPO_PUBLIC_FF_CART_PERF_V21=1
 * - EXPO_PUBLIC_FF_CART_TRACKING_V21=1
 *
 * - EXPO_PUBLIC_FF_CART_OPACITY_FIX_V22=0   (default ON)
 */
type Env = Record<string, string | undefined>;

function readEnv(): Env {
  // In Expo/RN, `process.env.EXPO_PUBLIC_*` is supported at build time.
  // Guarded for safety in non-standard runtimes/tests.
  const p: any = typeof process !== "undefined" ? process : undefined;
  const env: any = p && p.env ? p.env : {};
  return env as Env;
}

const env = readEnv();

const flags = {
  // Etapa 21
  ff_cart_perf_v21: env.EXPO_PUBLIC_FF_CART_PERF_V21 === "1",
  ff_cart_tracking_v21: env.EXPO_PUBLIC_FF_CART_TRACKING_V21 === "1",

  // Etapa 22 (bugfix crítico): opacidade/dimming após sair do carrinho (Modal/backdrop)
  // Default ON. Para desligar: EXPO_PUBLIC_FF_CART_OPACITY_FIX_V22=0
  ff_cart_opacity_fix_v22: env.EXPO_PUBLIC_FF_CART_OPACITY_FIX_V22 !== "0",
} as const;

export type FeatureFlags = typeof flags;
export default flags;
