import NetInfo from "@react-native-community/netinfo";
import { httpJson } from "./httpClient";
import { getOutbox, updateOutbox, type OutboxJob } from "./outboxStorage";

const MAX_ATTEMPTS = 5;

// Aqui você troca depois por endpoints reais (API própria / gateway)
const ENDPOINTS = {
  bling: "https://example.com/api/bling/orders",
  nuvemshop: "https://example.com/api/nuvemshop/orders",
} as const;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function processOutboxOnce(): Promise<{
  sent: number;
  remaining: number;
}> {
  const state = await NetInfo.fetch();
  if (!state.isConnected)
    return { sent: 0, remaining: (await getOutbox()).length };

  const outbox = await getOutbox();
  if (outbox.length === 0) return { sent: 0, remaining: 0 };

  const remaining: OutboxJob[] = [];
  let sent = 0;

  for (const job of outbox.reverse()) {
    // reverse para enviar mais antigo primeiro
    try {
      const url = ENDPOINTS[job.type];
      await httpJson<any>(url, "POST", job.payload);
      sent += 1;
    } catch {
      const attempts = job.attempts + 1;
      if (attempts < MAX_ATTEMPTS) {
        remaining.unshift({ ...job, attempts });
      }
    }
    await sleep(150); // cadência leve (evita burst)
  }

  await updateOutbox(remaining);
  return { sent, remaining: remaining.length };
}
