// utils/telemetry.ts
/**
 * Minimal telemetry façade.
 * - No external deps.
 * - Safe in production (no-op).
 * - In dev, logs to console for quick validation.
 */
export type TelemetryEvent =
  | "view_cart"
  | "click_checkout"
  | "checkout_start"
  | "remove_from_cart"
  | "update_qty"
  | "success"
  | "fail";

export type TelemetryProps = Record<string, unknown>;

export function track(event: TelemetryEvent, props?: TelemetryProps) {
  // Keep it inert in production builds unless you wire a real provider.
  if (!__DEV__) return;

  try {
    // eslint-disable-next-line no-console
    console.log(`[telemetry] ${event}`, props ?? {});
  } catch {
    // no-op
  }
}
