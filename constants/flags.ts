export type FeatureFlag =
  | "ff_cart_rehydration_hardened"
  | "ff_cart_o1_index"
  | "ff_cart_action_lock"
  | "ff_cart_analytics_v1"
  | "ff_cart_persist_v1"
  | "ff_cart_ui_v2"
  | "ff_cart_ux_upgrade_v1"
  | "ff_checkout_start_guardrails_v1"
  | "ff_checkout_ui_v1"
  | "ff_cart_cross_sell_v1"
  // CHECKOUT-003
  | "ff_checkout_address_v1"
  // CHECKOUT-004
  | "ff_checkout_payment_v1"
  // ORDER-001
  | "ff_order_place_mock_v1"
  // OBS-001
  | "ff_analytics_harden_v1"
  // ORDER-002
  | "ff_payment_adapter_v1";

const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
  ff_cart_rehydration_hardened: true,
  ff_cart_o1_index: true,
  ff_cart_action_lock: true,
  ff_cart_analytics_v1: true,
  ff_cart_persist_v1: true,

  // UI do carrinho
  ff_cart_ui_v2: false,

  // CART-002
  ff_cart_ux_upgrade_v1: false,

  // CHECKOUT-001
  ff_checkout_start_guardrails_v1: true,

  // CHECKOUT-002
  ff_checkout_ui_v1: true,

  // CART-003
  ff_cart_cross_sell_v1: false,

  // CHECKOUT-003 (Address)
  ff_checkout_address_v1: false,

  // CHECKOUT-004 (Payment)
  ff_checkout_payment_v1: false,

  // ORDER-001 (Place order mock)
  ff_order_place_mock_v1: false,

  // OBS-001 (Analytics harden)
  ff_analytics_harden_v1: false,

  // ORDER-002 (Payment adapter)
  ff_payment_adapter_v1: false,
};

export function isFlagEnabled(flag: FeatureFlag): boolean {
  const overrides = (globalThis as any).__FLAGS__ as
    | Partial<Record<FeatureFlag, boolean>>
    | undefined;

  const v = overrides?.[flag];
  return typeof v === "boolean" ? v : DEFAULT_FLAGS[flag];
}