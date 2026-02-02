import { InteractionManager } from "react-native";
import { FeatureFlags, getFeatureFlag } from "../constants/featureFlags";

type AnalyticsPayload = Record<string, unknown>;

type AnalyticsEvent = {
  name: string;
  payload?: AnalyticsPayload;
  ts: number;
};

let initialized = false;
let enabled = false;

// fila leve em memória (MVP)
const queue: AnalyticsEvent[] = [];
const MAX_QUEUE = 200;

// usado para medir TTI (tempo até “app ficar interativo”)
let appStartTs = Date.now();

function push(event: AnalyticsEvent) {
  queue.push(event);
  if (queue.length > MAX_QUEUE) queue.shift();
}

export async function initAnalytics(): Promise<void> {
  if (initialized) return;

  appStartTs = Date.now();
  enabled = await getFeatureFlag(FeatureFlags.ANALYTICS_EVENTS);
  initialized = true;

  track("system_start", { ts: Date.now() });
}

/**
 * Track genérico (MVP): apenas console + fila local.
 * - Se a flag estiver desligada, vira no-op (zero impacto visual).
 */
export function track(name: string, payload?: AnalyticsPayload) {
  if (!initialized || !enabled) return;

  const evt: AnalyticsEvent = { name, payload, ts: Date.now() };
  push(evt);

  // eslint-disable-next-line no-console
  console.log(`[analytics] ${name}`, payload ?? {});
}

/**
 * View de tela (recomendado para Expo Router)
 */
export function trackScreenView(screen: string) {
  track("view", { screen });
}

/**
 * Tempo até interativo (TTI) aproximado, sem mudar layout.
 * Mede do initAnalytics até o afterInteractions.
 */
export function trackTimeToInteractive(context: string) {
  if (!initialized || !enabled) return;

  const started = appStartTs;
  InteractionManager.runAfterInteractions(() => {
    const ms = Date.now() - started;
    track("time_to_interactive", { context, ms });
  });
}

/**
 * (Debug/diagnóstico) Ler fila local atual.
 * Útil para validar sem backend.
 */
export function getAnalyticsQueueSnapshot(): AnalyticsEvent[] {
  return queue.slice(-50);
}

/**
 * (Debug Flags) Snapshot de todas as Feature Flags atuais.
 * - Não altera UI.
 * - Usa o mesmo caminho do app (getFeatureFlag).
 */
export async function getFeatureFlags(): Promise<Record<string, boolean>> {
  const keys = Object.values(FeatureFlags) as string[];
  const values = await Promise.all(keys.map((k) => getFeatureFlag(k as any).catch(() => false)));

  const out: Record<string, boolean> = {};
  for (let i = 0; i < keys.length; i++) out[keys[i]] = Boolean(values[i]);
  return out;
}
