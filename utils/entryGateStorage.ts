// utils/entryGateStorage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_SKIP = "@plugaishop:entry_gate_skip_biometric";
const KEY_LAST_BG_AT = "@plugaishop:entry_gate_last_background_at";

export async function setEntryGateSkipBiometric(v: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY_SKIP, v ? "1" : "0");
}

export async function getEntryGateSkipBiometric(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEY_SKIP);
  return raw === "1";
}

export async function setEntryGateLastBackgroundAt(ts: number): Promise<void> {
  const n = Number.isFinite(ts) ? ts : Date.now();
  await AsyncStorage.setItem(KEY_LAST_BG_AT, String(n));
}

export async function getEntryGateLastBackgroundAt(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEY_LAST_BG_AT);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

export async function clearEntryGateLastBackgroundAt(): Promise<void> {
  await AsyncStorage.removeItem(KEY_LAST_BG_AT);
}