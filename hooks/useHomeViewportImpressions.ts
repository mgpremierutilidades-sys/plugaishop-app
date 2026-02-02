// hooks/useHomeViewportImpressions.ts
import { useCallback, useRef } from "react";

/**
 * MVP: garante "once" por key, e fornece um onScroll compatível.
 * Sem dependências e sem medir viewport (evita custo/perf).
 */
export function useHomeViewportImpressions() {
  const seenRef = useRef<Set<string>>(new Set());

  const impressionOnce = useCallback((key: string) => {
    const k = String(key ?? "");
    if (!k) return false;
    if (seenRef.current.has(k)) return false;
    seenRef.current.add(k);
    return true;
  }, []);

  const onScroll = useCallback((_y: number, _contentH: number, _viewportH: number) => {
    // MVP: noop
  }, []);

  return { onScroll, impressionOnce };
}
