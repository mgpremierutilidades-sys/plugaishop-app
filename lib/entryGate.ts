import * as LocalAuthentication from "expo-local-authentication";
import {
  getEntryGateSkipBiometric,
  setEntryGateLastBackgroundAt,
} from "../utils/entryGateStorage";

export async function decideEntryGate(
  isEnabled: boolean,
): Promise<{
  shouldGate: boolean;
  reason: "disabled" | "skip" | "not_available" | "gate";
}> {
  if (!isEnabled) return { shouldGate: false, reason: "disabled" };

  const skip = await getEntryGateSkipBiometric();
  if (skip) return { shouldGate: false, reason: "skip" };

  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !enrolled)
      return { shouldGate: false, reason: "not_available" };
  } catch {
    return { shouldGate: false, reason: "not_available" };
  }

  return { shouldGate: true, reason: "gate" };
}

export async function markBackgroundNow(): Promise<void> {
  try {
    await setEntryGateLastBackgroundAt(Date.now());
  } catch {
    // no-op
  }
}