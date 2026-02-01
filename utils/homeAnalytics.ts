import { FeatureFlags, getFeatureFlag } from "../constants/featureFlags";
import { track } from "./analytics";

export type HomeFailScope = "home_load" | "home_render" | "home_action";

type FlagCache = { value: boolean | null; at: number };
const CACHE_MS = 5_000;

const cacheV1: FlagCache = { value: null, at: 0 };
const cacheV2: FlagCache = { value: null, at: 0 };
const cacheV3: FlagCache = { value: null, at: 0 };

async function isFlagEnabled(
  flagKey: (typeof FeatureFlags)[keyof typeof FeatureFlags],
  cache: FlagCache
): Promise<boolean> {
  const now = Date.now();
  if (cache.value !== null && now - cache.at < CACHE_MS) return cache.value;

  try {
    const v = await getFeatureFlag(flagKey as any);
    cache.value = v;
    cache.at = now;
    return v;
  } catch {
    cache.value = false;
    cache.at = now;
    return false;
  }
}

async function isHomeV1Enabled(): Promise<boolean> {
  return isFlagEnabled(FeatureFlags.HOME_EVENTS_V1, cacheV1);
}

async function isHomeV2Enabled(): Promise<boolean> {
  return isFlagEnabled(FeatureFlags.HOME_EVENTS_V2, cacheV2);
}

async function isHomeV3Enabled(): Promise<boolean> {
  return isFlagEnabled(FeatureFlags.HOME_EVENTS_V3, cacheV3);
}

/** Etapa 1 — View */
export async function trackHomeView(): Promise<void> {
  if (!(await isHomeV1Enabled())) return;
  track("view", { screen: "home" });
}

/** Etapa 1 — Click no card do produto */
export async function trackHomeProductClick(args: { productId: string; position?: number }): Promise<void> {
  if (!(await isHomeV1Enabled())) return;

  const { productId, position } = args;
  track("click", {
    screen: "home",
    target: "product_card",
    productId,
    ...(typeof position === "number" ? { position } : {}),
  });
}

/** Etapa 1 — Fail-safe (log de falha) */
export async function trackHomeFail(args: { scope: HomeFailScope; message: string; code?: string }): Promise<void> {
  if (!(await isHomeV1Enabled())) return;

  const { scope, message, code } = args;
  track("fail", {
    screen: "home",
    scope,
    message,
    ...(code ? { code } : {}),
  });
}

/** Etapa 2 — Scroll depth (25/50/75/100) */
export async function trackHomeScrollDepth(depthPct: number): Promise<void> {
  if (!(await isHomeV2Enabled())) return;

  track("view", {
    screen: "home",
    target: "scroll_depth",
    depthPct,
  });
}

/** Etapa 2 — Impressão de blocos */
export async function trackHomeBlockImpression(blockId: string): Promise<void> {
  if (!(await isHomeV2Enabled())) return;

  track("view", {
    screen: "home",
    target: "block_impression",
    blockId,
  });
}

/** Etapa 4 — Search (debounced) */
export async function trackHomeSearch(args: { queryLen: number; hasCategory: boolean }): Promise<void> {
  if (!(await isHomeV3Enabled())) return;

  track("view", {
    screen: "home",
    target: "search",
    ...args,
  });
}

/** Etapa 4 — Troca de categoria */
export async function trackHomeCategorySelect(args: { category: string }): Promise<void> {
  if (!(await isHomeV3Enabled())) return;

  track("click", {
    screen: "home",
    target: "category",
    ...args,
  });
}

/** Etapa 4 — Restore de estado (filtro) */
export async function trackHomeStateRestore(args: { restored: boolean }): Promise<void> {
  if (!(await isHomeV3Enabled())) return;

  track("view", {
    screen: "home",
    target: "state_restore",
    ...args,
  });
}
