// src/cart/useCartSelection.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { softHaptic } from "./cartPricing";

export function useCartSelection(ids: string[]) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // Sempre que os ids mudarem, padroniza seleção: tudo marcado
  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const id of ids) next[id] = true;
    setSelected(next);
  }, [ids]);

  const toggleSelect = useCallback((id: string) => {
    softHaptic();
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const selectAll = useCallback(() => {
    softHaptic();
    setSelected((prev) => {
      const next: Record<string, boolean> = { ...prev };
      for (const id of ids) next[id] = true;
      return next;
    });
  }, [ids]);

  const anySelected = useMemo(() => {
    for (const id of ids) if (selected[id]) return true;
    return false;
  }, [ids, selected]);

  const selectedCount = useMemo(() => {
    let c = 0;
    for (const id of ids) if (selected[id]) c += 1;
    return c;
  }, [ids, selected]);

  return {
    selected,
    setSelected,
    toggleSelect,
    selectAll,
    anySelected,
    selectedCount,
  };
}
