export type FeatureFlag =
  | "ff_pdp_v1"
  | "ff_pdp_buy_now_v1"
  | "ff_pdp_shipping_cep_v1"
  | "ff_orders_v1"
  | "ff_checkout_start_guardrails_v1"
  | "ff_cart_rehydration_hardened"
  | "ff_cart_o1_index"
  | "ff_cart_action_lock"
  | "ff_cart_analytics_v1"
  | "ff_cart_persist_v1";

const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
  ff_pdp_v1: true,
  ff_pdp_buy_now_v1: true,
  ff_pdp_shipping_cep_v1: true,
  ff_orders_v1: true,

  ff_checkout_start_guardrails_v1: true,
  ff_cart_rehydration_hardened: true,
  ff_cart_o1_index: true,
  ff_cart_action_lock: true,
  ff_cart_analytics_v1: true,
  ff_cart_persist_v1: true,
};

export function isFlagEnabled(flag: FeatureFlag): boolean {
  const overrides = (globalThis as any).__FLAGS__ as
    | Partial<Record<FeatureFlag, boolean>>
    | undefined;

  const v = overrides?.[flag];
  return typeof v === "boolean" ? v : DEFAULT_FLAGS[flag];
}