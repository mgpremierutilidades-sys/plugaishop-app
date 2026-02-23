import { isFlagEnabled } from "../constants/flags";

type TrackProps = Record<string, any>;

// [AUTOPILOT_EVENTS] canonical event names (avoid typos)
export const HomeAchadinhosEvents = {
  impression: "home.achadinhos.impression",
  cardClick: "home.achadinhos.card_click",
  shelfScroll: "home.achadinhos.shelf_scroll",
} as const;


type QueuedEvent = {
  event: string;
  props?: TrackProps;
  ts: number;
};

// ============================
// OBS-001 — parâmetros leves
// ============================
const MAX_QUEUE = 200; // proteção contra memória
const FLUSH_DEBOUNCE_MS = 250; // debounce do flush
const FLUSH_BATCH_SIZE = 30; // por tick
const RATE_WINDOW_MS = 1500;
const RATE_MAX_PER_WINDOW = 8;

// Buckets por evento (rate limit)
type Bucket = { t: number; c: number };
const buckets: Record<string, Bucket> = {};

// Fila e agendamento
const queue: QueuedEvent[] = [];
let flushTimer: any = null;
let flushing = false;

// Evita recursão ao emitir meta-eventos
let metaDepth = 0;

function now() {
  return Date.now();
}

function safeJson(v: any) {
  try {
    return v ?? {};
  } catch {
    return {};
  }
}

/**
 * Transporte mínimo atual.
 * Trocar depois por provider real (Amplitude/Firebase/etc).
 * Mantém comportamento anterior em __DEV__.
 */
function transport(event: string, props?: TrackProps): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[analytics] ${event}`, safeJson(props));
  }
}

function emitMeta(event: "analytics_drop" | "analytics_flush", props?: TrackProps) {
  // Não pode entrar em loop se o provider chamar track() de volta no futuro
  if (metaDepth > 0) return;
  metaDepth++;
  try {
    transport(event, props);
  } finally {
    metaDepth--;
  }
}

function rateAllows(event: string): boolean {
  const t = now();
  const b = buckets[event] ?? { t, c: 0 };

  if (t - b.t > RATE_WINDOW_MS) {
    b.t = t;
    b.c = 0;
  }

  b.c += 1;
  buckets[event] = b;

  return b.c <= RATE_MAX_PER_WINDOW;
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, FLUSH_DEBOUNCE_MS);
}

async function flush(): Promise<void> {
  if (flushing) return;
  flushing = true;

  try {
    let processed = 0;

    while (queue.length > 0 && processed < FLUSH_BATCH_SIZE) {
      const ev = queue.shift()!;
      processed++;

      try {
        transport(ev.event, ev.props);
      } catch {
        // crash-safe: não requeue pra evitar loop infinito
        emitMeta("analytics_drop", { event: ev.event, reason: "transport_exception" });
      }
    }

    // Se ainda tem itens, agenda próximo tick (não trava UI)
    if (queue.length > 0) {
      scheduleFlush();
      return;
    }

    // Fila drenada
    emitMeta("analytics_flush", { remaining: 0 });
  } finally {
    flushing = false;
  }
}

/**
 * API pública — mantém nome track() (compatibilidade).
 * - Se ff_analytics_harden_v1 OFF: comportamento antigo (log dev)
 * - Se ON: crash-safe + rate limit + fila + flush debounce
 */
export function track(event: string, props?: TrackProps): void {
  try {
    const hardened = isFlagEnabled("ff_analytics_harden_v1");

    if (!hardened) {
      transport(event, props);
      return;
    }

    // Rate limit (por nome de evento)
    if (!rateAllows(event)) {
      emitMeta("analytics_drop", { event, reason: "rate_limit" });
      return;
    }

    // Enfileira (leve) e flush assíncrono
    if (queue.length >= MAX_QUEUE) {
      // drop policy: remove o mais antigo e registra
      queue.shift();
      emitMeta("analytics_drop", { event, reason: "queue_overflow", max_queue: MAX_QUEUE });
    }

    queue.push({ event, props: safeJson(props), ts: now() });
    scheduleFlush();
  } catch {
    // crash-safe total: não pode derrubar UI
  }
}

/**
 * Opcional: força flush imediato (útil em logout/background no futuro).
 * Não é obrigatório para telas, mas ajuda a instrumentação/runner.
 */
export async function flushAnalytics(): Promise<void> {
  try {
    // cancela debounce e flush agora
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    await flush();
  } catch {
    // noop
  }
}