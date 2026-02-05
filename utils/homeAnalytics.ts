import { track } from "./telemetry";

export async function trackHomeView(payload?: Record<string, unknown>) {
  return track("home_view", payload);
}

export async function trackHomeFail(payload?: Record<string, unknown>) {
  return track("home_fail", payload);
}

export async function trackHomeScrollDepth(depthPct: number) {
  return track("home_scroll_depth", { depthPct: Number(depthPct) });
}

export async function trackHomeSearch(payload: { queryLen: number; hasCategory: boolean }) {
  return track("home_search", payload);
}

export async function trackHomeCategorySelect(payload: { category: string }) {
  return track("home_category_select", payload);
}

export async function trackHomeProductClick(payload: { productId: string; position?: number }) {
  return track("home_product_click", payload);
}

export async function trackHomeBlockImpression(blockId: string) {
  return track("home_block_impression", { blockId: String(blockId) });
}

export async function trackHomeStateRestore(payload: { restored: boolean }) {
  return track("home_state_restore", payload);
}
