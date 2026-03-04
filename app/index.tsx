// app/index.tsx
import { Redirect } from "expo-router";
import { useEffect, useMemo } from "react";

import { isFlagEnabled } from "../constants/flags";
import { track } from "../lib/analytics";

export default function AppIndex() {
  const enabled = useMemo(() => isFlagEnabled("ff_entry_default_gate_v1"), []);

  useEffect(() => {
    try {
      track("entry_root_redirect_view", { enabled });
    } catch {}
  }, [enabled]);

  const to = enabled ? "/entry/index" : "/(tabs)";

  useEffect(() => {
    try {
      track("entry_root_redirect", { to });
    } catch {}
  }, [to]);

  return <Redirect href={to as any} />;
}