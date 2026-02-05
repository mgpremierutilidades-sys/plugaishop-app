import { FeatureFlags, getFeatureFlag } from "../constants/featureFlags";
import { track } from "./telemetry";

export async function analyticsTrack(event: string, payload?: Record<string, unknown>) {
  const enabled = getFeatureFlag("ANALYTICS_EVENTS");
  if (!enabled) return;
  return track(event, payload);
}

// opcional: gate explícito por runtime map, se você preferir
export function isAnalyticsEnabled() {
  return Boolean(FeatureFlags.ANALYTICS_EVENTS);
}
