import AsyncStorage from "@react-native-async-storage/async-storage";

export type OutboxJob = {
  id: string;
  type: "bling" | "nuvemshop";
  createdAt: string;
  payload: any;
  attempts: number;
};

const KEY = "@plugaishop:outbox";

export async function getOutbox(): Promise<OutboxJob[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as OutboxJob[];
  } catch {
    return [];
  }
}

export async function enqueueJob(job: Omit<OutboxJob, "attempts">) {
  const list = await getOutbox();
  const next: OutboxJob[] = [{ ...job, attempts: 0 }, ...list];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function updateOutbox(next: OutboxJob[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}
