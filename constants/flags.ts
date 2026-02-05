export const FLAGS = {
  // Carrinho
  ff_cart_perf_v21: true,
  ff_cart_tracking_v21: true,
  ff_cart_opacity_fix_v22: true,

  // Exemplo legado (se algum lugar usar)
  CART_V2: true,
  TELEMETRY: true,
} as const;

export type FlagKey = keyof typeof FLAGS;

export function isFlagEnabled(key: FlagKey): boolean {
  return Boolean(FLAGS[key]);
}

// ✅ Compat: permitir `import flags from "../../constants/flags"`
export default FLAGS;
