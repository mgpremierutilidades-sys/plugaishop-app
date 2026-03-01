export type FeatureFlag =
  | "ff_pdp_v1"
  | "ff_pdp_buy_now_v1"
  | "ff_pdp_shipping_cep_v1"
  | "ff_dev_tools_v1"
  | "ff_orders_v1"
  | "ff_orders_ui_v1"
  | "ff_orders_progress_v1"
  | "ff_orders_autoprogress_v1"
  | "ff_orders_notifications_v1"
  | "ff_orders_notifications_badge_v1"
  | "ff_orders_notifications_cta_v1"
  | "ff_orders_notifications_inbox_v1"
  | "ff_orders_tracking_v1"
  | "ff_checkout_start_guardrails_v1"
  | "ff_cart_rehydration_hardened"
  | "ff_cart_o1_index"
  | "ff_cart_action_lock"
  | "ff_cart_analytics_v1"
  | "ff_cart_persist_v1"
  | "ff_cart_ui_v2"
  | "ff_reviews_verified_purchase_v1"
  | "ff_entry_biometric_gate_v1";

const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
  ff_pdp_v1: true,
  ff_pdp_buy_now_v1: true,
  ff_pdp_shipping_cep_v1: true,

  ff_dev_tools_v1: false,

  ff_orders_v1: true,
  ff_orders_ui_v1: true,
  ff_orders_progress_v1: true,
  ff_orders_autoprogress_v1: true,
  ff_orders_notifications_v1: true,
  ff_orders_notifications_badge_v1: true,
  ff_orders_notifications_cta_v1: true,
  ff_orders_notifications_inbox_v1: true,
  ff_orders_tracking_v1: true,

  ff_checkout_start_guardrails_v1: true,

  ff_cart_rehydration_hardened: true,
  ff_cart_o1_index: true,
  ff_cart_action_lock: true,
  ff_cart_analytics_v1: true,
  ff_cart_persist_v1: true,
  ff_cart_ui_v2: true,

  ff_reviews_verified_purchase_v1: false,

  ff_entry_biometric_gate_v1: true,
};

export function isFlagEnabled(flag: FeatureFlag): boolean {
  const overrides = (globalThis as any).__FLAGS__ as
    | Partial<Record<FeatureFlag, boolean>>
    | undefined;

  const v = overrides?.[flag];
  return typeof v === "boolean" ? v : DEFAULT_FLAGS[flag];
}