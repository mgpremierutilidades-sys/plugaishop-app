import { FeatureFlags, getFeatureFlag } from "../constants/featureFlags";
import { initAnalytics, track } from "./analytics";

export type HomeFailScope = "home_load" | "home_render" | "home_action";

// Garante init (evita perder o primeiro evento se Home disparar antes do Root terminar init)
let initPromise: Promise<void> | null = null;
async function ensureAnalyticsInit(): Promise<void> {
  if (!initPromise) initPromise = initAnalytics();
  await initPromise;
}

type FlagCache = { value: boolean | null; at: number };
const CACHE_MS = 5_000;
const cacheV1: FlagCache = { value: null, at: 0 };
const cacheV2: FlagCache = { value: null, at: 0 };

async function isFlagEnabled(flag: keyof typeof FeatureFlags, cache: FlagCache): Promise<boolean> {
  const now = Date.now();
  if (cache.value !== null && now - cache.at < CACHE_MS) return cache.value;

  const v = await getFeatureFlag(FeatureFlags[flag]);
  cache.value = v;
  cache.at = now;
  return v;
}

async function isHomeV1Enabled(): Promise<boolean> {
  return isFlagEnabled("HOME_EVENTS_V1", cacheV1);
}

async function isHomeV2Enabled(): Promise<boolean> {
  return isFlagEnabled("HOME_EVENTS_V2", cacheV2);
}

export async function trackHomeView(): Promise<void> {
  if (!(await isHomeV1Enabled())) return;
  await ensureAnalyticsInit();
  track("view", { screen: "home" });
}

export async function trackHomeProductClick(args: { productId: string; position?: number }): Promise<void> {
  if (!(await isHomeV1Enabled())) return;
  await ensureAnalyticsInit();

  const { productId, position } = args;
  track("click", {
    screen: "home",
    target: "product_card",
    productId,
    ...(typeof position === "number" ? { position } : {}),
  });
}

export async function trackHomeFail(args: { scope: HomeFailScope; message: string; code?: string }): Promise<void> {
  if (!(await isHomeV1Enabled())) return;
  await ensureAnalyticsInit();

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
  await ensureAnalyticsInit();

  track("view", {
    screen: "home",
    target: "scroll_depth",
    depthPct,
  });
}

/** Etapa 2 — Impressão de blocos */
export async function trackHomeBlockImpression(blockId: string): Promise<void> {
  if (!(await isHomeV2Enabled())) return;
  await ensureAnalyticsInit();

  track("view", {
    screen: "home",
    target: "block_impression",
    blockId,
  });
}
