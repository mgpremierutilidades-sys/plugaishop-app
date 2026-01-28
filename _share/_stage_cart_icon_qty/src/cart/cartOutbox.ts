// src/cart/cartOutbox.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { httpJson } from "../../utils/httpClient";

export type CartOutboxJob = {
  id: string;
  createdAt: string;
  payload: any;
  attempts: number;
};

const KEY = "@plugaishop:cart:outbox";
const MAX_ATTEMPTS = 6;

/**
 * Endpoint placeholder: substitua pelo gateway real quando existir.
 * A arquitetura (outbox) já fica pronta para offline-first.
 */
const CART_SYNC_ENDPOINT = "https://example.com/api/cart/sync";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function uuid() {
  // UUID simples sem dependências (suficiente para outbox local)
  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2) +
    "-" +
    Math.random().toString(36).slice(2)
  );
}

export async function getCartOutbox(): Promise<CartOutboxJob[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CartOutboxJob[];
  } catch {
    return [];
  }
}

async function setCartOutbox(next: CartOutboxJob[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

/**
 * Enfileira uma mutação do carrinho.
 * Coalescência mínima: evita acumular múltiplos SET_QTY do mesmo item,
 * mantendo apenas o mais recente.
 */
export async function enqueueCartJob(payload: any) {
  const list = await getCartOutbox();
  const op = String(payload?.op ?? "");
  const id = String(payload?.id ?? "");

  let next = list;

  if (op === "SET_QTY" && id) {
    next = list.filter((j) => !(String(j?.payload?.op) === "SET_QTY" && String(j?.payload?.id) === id));
  }

  const job: CartOutboxJob = {
    id: uuid(),
    createdAt: new Date().toISOString(),
    payload,
    attempts: 0,
  };

  await setCartOutbox([job, ...next]);
}

/**
 * Processa a outbox UMA vez.
 * - Só roda se estiver online
 * - Envia do mais antigo para o mais novo
 * - Retry com backoff e limite de tentativas
 */
export async function processCartOutboxOnce(): Promise<{ sent: number; remaining: number }> {
  const state = await NetInfo.fetch();
  if (!state.isConnected) return { sent: 0, remaining: (await getCartOutbox()).length };

  const outbox = await getCartOutbox();
  if (outbox.length === 0) return { sent: 0, remaining: 0 };

  const remaining: CartOutboxJob[] = [];
  let sent = 0;

  for (const job of outbox.reverse()) {
    try {
      await httpJson<any>(CART_SYNC_ENDPOINT, "POST", job.payload);
      sent += 1;
    } catch {
      const attempts = job.attempts + 1;
      if (attempts < MAX_ATTEMPTS) {
        remaining.unshift({ ...job, attempts });
      }
    }
    await sleep(120);
  }

  await setCartOutbox(remaining);
  return { sent, remaining: remaining.length };
}
