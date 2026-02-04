export const FLAGS = {
  CART_V2: true,
  TELEMETRY: true,
} as const;

export type FlagKey = keyof typeof FLAGS;

export function isFlagEnabled(key: FlagKey): boolean {
  return Boolean(FLAGS[key]);
}
