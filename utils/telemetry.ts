type TrackPayload =
  | Record<string, unknown>
  | string
  | number
  | boolean
  | null
  | undefined;

function normalizePayload(payload: TrackPayload): Record<string, unknown> | undefined {
  if (payload == null) return undefined;
  if (typeof payload === "object") return payload as Record<string, unknown>;
  return { value: payload };
}

// ✅ Retorna Promise pra permitir `.catch(...)` sem erro de TS
export async function track(event: string, payload?: TrackPayload): Promise<void> {
  const _payload = normalizePayload(payload);

  // provider real entra aqui depois
  void event;
  void _payload;
  return;
}

export function trackSafe(event: string, payload?: TrackPayload) {
  void track(event, payload).catch(() => {});
}
