// src/cart/cartOutbox.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@plugaishop:cart:outbox:v1";

type Job = Record<string, unknown>;

export async function enqueueCartJob(job: Job): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = (raw ? (JSON.parse(raw) as Job[]) : []) ?? [];
    list.push(job);
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // best-effort
  }
}

export async function processCartOutboxOnce(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = (raw ? (JSON.parse(raw) as Job[]) : []) ?? [];

    // Placeholder: aqui você plugaria uma API real.
    // Por enquanto: consideramos "processado" e limpamos.
    if (list.length > 0) {
      await AsyncStorage.setItem(KEY, JSON.stringify([]));
    }
  } catch {
    // best-effort
  }
}
