export const featureFlags = {
  home: true,
  cart: true,
} as const;

export type FeatureFlagKey = keyof typeof featureFlags;

export function isFeatureEnabled(key: FeatureFlagKey): boolean {
  return Boolean(featureFlags[key]);
}
