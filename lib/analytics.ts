// lib/analytics.ts
import { getActiveScreenName } from "./nav";

 
export type TrackProps = Record<string, any>;

type Normalized = {
  canonical: string;
  original: string;
  changed: boolean;
  reasons: string[];
};

const RESERVED_KEYS = new Set([
  "event",
  "ts",
  "screen",
  "event_original",
  "event_normalize_reasons",
]);

function sanitizeProps(props?: TrackProps): TrackProps {
  if (!props) return {};
  const out: TrackProps = {};
  for (const [k, v] of Object.entries(props)) {
    if (RESERVED_KEYS.has(k)) continue; // não deixa sobrescrever campos do adapter
    out[k] = v;
  }
  return out;
}

export function normalizeEventName(original: string): Normalized {
  const reasons: string[] = [];
  const originalTrim = (original ?? "").trim();

  if (!originalTrim) {
    return {
      canonical: "invalid_event",
      original,
      changed: true,
      reasons: ["empty"],
    };
  }

  let s = originalTrim;

  // Separators -> underscore (inclui "." e "-")
  const beforeSeparators = s;
  s = s.replace(/[.\-\/\s]+/g, "_");
  if (s !== beforeSeparators) reasons.push("separator_to_underscore");

  // camelCase / PascalCase -> snake_case (best-effort)
  const beforeCamel = s;
  s = s.replace(/([a-z0-9])([A-Z])/g, "$1_$2");
  if (s !== beforeCamel) reasons.push("camel_to_snake");

  // Lowercase
  const beforeLower = s;
  s = s.toLowerCase();
  if (s !== beforeLower) reasons.push("lowercased");

  // Remove invalid chars
  const beforeInvalid = s;
  s = s.replace(/[^a-z0-9_]/g, "");
  if (s !== beforeInvalid) reasons.push("removed_invalid_chars");

  // Collapse underscores + trim
  const beforeCollapse = s;
  s = s.replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  if (s !== beforeCollapse) reasons.push("collapsed_underscores");

  const canonical = s || "invalid_event";
  const changed = canonical !== originalTrim;

  return {
    canonical,
    original,
    changed,
    reasons: changed ? reasons : [],
  };
}

function nowTs(): number {
  return Date.now();
}

export function track(event: string, props?: TrackProps): void {
  const norm = normalizeEventName(event);
  const screen = getActiveScreenName() || "unknown";

  const safeProps = sanitizeProps(props);

  const payload: TrackProps = {
    ...safeProps,
    event: norm.canonical,
    ts: nowTs(),
    screen,
  };

  if (norm.changed) {
    payload.event_original = event;
    payload.event_normalize_reasons = norm.reasons;
  }

  // Adapter mínimo: DEV log. Em PROD, no-op (por enquanto).
  if (__DEV__) {
    if (norm.changed) {
      console.warn(
        `[analytics] non-canonical event "${event}" -> "${norm.canonical}"`,
        { reasons: norm.reasons }
      );
    }
    console.log(`[analytics] ${payload.event}`, payload);
  }
}