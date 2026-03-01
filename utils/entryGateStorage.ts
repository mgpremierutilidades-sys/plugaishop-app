import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_SKIP = "@plugaishop:entryGate:skipBiometric";
const KEY_BG_AT = "@plugaishop:entryGate:lastBackgroundAt";

export async function getEntryGateSkipBiometric(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY_SKIP);
    return raw === "1";
  } catch {
    return false;
  }
}

export async function setEntryGateSkipBiometric(value: boolean): Promise<void> {
  try {
    if (value) await AsyncStorage.setItem(KEY_SKIP, "1");
    else await AsyncStorage.removeItem(KEY_SKIP);
  } catch {
    // no-op
  }
}

export async function getEntryGateLastBackgroundAt(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_BG_AT);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export async function setEntryGateLastBackgroundAt(ts: number): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_BG_AT, String(ts));
  } catch {
    // no-op
  }
}