import { FeatureFlags, getFeatureFlag } from "../constants/featureFlags";
import { track } from "./analytics";

export type HomeFailScope = "home_load" | "home_render" | "home_action";

// Cache curto para reduzir leituras do AsyncStorage em interações rápidas.
let cachedEnabled: boolean | null = null;
let cachedAt = 0;
const CACHE_MS = 5_000;

async function isHomeEventsEnabled(): Promise<boolean> {
  const now = Date.now();
  if (cachedEnabled !== null && now - cachedAt < CACHE_MS) return cachedEnabled;

  const v = await getFeatureFlag(FeatureFlags.HOME_EVENTS_V1);
  cachedEnabled = v;
  cachedAt = now;
  return v;
}

export async function trackHomeView(): Promise<void> {
  if (!(await isHomeEventsEnabled())) return;
  track("view", { screen: "home" });
}

export async function trackHomeProductClick(args: {
  productId: string;
  position?: number;
}): Promise<void> {
  if (!(await isHomeEventsEnabled())) return;

  const { productId, position } = args;
  track("click", {
    screen: "home",
    target: "product_card",
    productId,
    ...(typeof position === "number" ? { position } : {}),
  });
}

export async function trackHomeFail(args: {
  scope: HomeFailScope;
  message: string;
  code?: string;
}): Promise<void> {
  if (!(await isHomeEventsEnabled())) return;

  const { scope, message, code } = args;
  track("fail", {
    screen: "home",
    scope,
    message,
    ...(code ? { code } : {}),
  });
}
