// constants/flags.ts
/**
 * Feature flags (Etapa 21)
 * - Defaults OFF for safety.
 * - Can be enabled via Expo public env vars:
 *   - EXPO_PUBLIC_FF_CART_PERF_V21=1
 *   - EXPO_PUBLIC_FF_CART_TRACKING_V21=1
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
  ff_cart_perf_v21: env.EXPO_PUBLIC_FF_CART_PERF_V21 === "1",
  ff_cart_tracking_v21: env.EXPO_PUBLIC_FF_CART_TRACKING_V21 === "1",
} as const;

export type FeatureFlags = typeof flags;
export default flags;
