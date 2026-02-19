export type FeatureFlag =
  | "ff_cart_rehydration_hardened"
  | "ff_cart_o1_index"
  | "ff_cart_action_lock"
  | "ff_cart_analytics_v1"
  | "ff_cart_persist_v1"
  | "ff_cart_ui_v2";

const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
  ff_cart_rehydration_hardened: true,
  ff_cart_o1_index: true,
  ff_cart_action_lock: true,
  ff_cart_analytics_v1: true,
  ff_cart_persist_v1: true,

  // PR #1 — Carrinho (UI/UX)
  ff_cart_ui_v2: false,
};

export function isFlagEnabled(flag: FeatureFlag): boolean {
  const overrides = (globalThis as any).__FLAGS__ as
    | Partial<Record<FeatureFlag, boolean>>
    | undefined;

  const v = overrides?.[flag];
  return typeof v === "boolean" ? v : DEFAULT_FLAGS[flag];
}
