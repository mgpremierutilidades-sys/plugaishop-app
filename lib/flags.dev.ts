import type { FeatureFlag } from "../constants/flags";

/**
 * DEV ONLY: Override de flags para rollback rápido sem console.
 */
export const DEV_FLAGS: Partial<Record<FeatureFlag, boolean>> = {
  ff_cart_rehydration_hardened: false,
  ff_cart_persist_v1: false,
  ff_cart_action_lock: false,
  ff_cart_analytics_v1: false,
};
