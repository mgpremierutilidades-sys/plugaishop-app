// context/CartContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";

import type { Product } from "../data/catalog";
import { enqueueCartJob, processCartOutboxOnce } from "../src/cart/cartOutbox";

// ===== Types
export type CartItem = {
  /** Chave estável do item no carrinho (suporta variação quando existir) */
  id: string;
  product: Product;
  qty: number;

  /** Metadados de auditoria (útil para debug e merges) */
  addedAt: string;   // ISO
  updatedAt: string; // ISO
};

export type CartState = {
  version: 1;
  itemsById: Record<string, CartItem>;
};

export type CartApi = {
  /** Lista para UI */
  items: CartItem[];

  /** Estado de boot */
  hydrated: boolean;

  /** Operações */
  addItem: (product: Product, qty?: number, opts?: { idKey?: string }) => void;
  removeItem: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clearCart: () => void;

  // Aliases/compat (evita quebrar telas antigas)
  add?: (product: Product) => void;
  remove?: (product: Product, qty?: number) => void;
  decItem?: (product: Product, qty?: number) => void;
  clear?: () => void;
  reset?: () => void;

  /** Observabilidade / debug */
  flushSyncOnce: () => Promise<void>;
};

const STORAGE_KEY = "@plugaishop:cart:v1";

const initialState: CartState = { version: 1, itemsById: {} };

type Action =
  | { type: "HYDRATE"; state: CartState }
  | { type: "ADD"; item: CartItem }
  | { type: "REMOVE"; id: string }
  | { type: "SET_QTY"; id: string; qty: number }
  | { type: "CLEAR" };

function clampQty(qty: number) {
  const n = Number(qty);
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.floor(n));
}

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "HYDRATE": {
      // Merge defensivo: preserva shape
      const safe = action.state && action.state.version === 1 ? action.state : initialState;
      return { version: 1, itemsById: safe.itemsById ?? {} };
    }
    case "ADD": {
      const id = String(action.item.id);
      const prev = state.itemsById[id];
      if (prev) {
        const qty = clampQty(prev.qty + action.item.qty);
        return {
          ...state,
          itemsById: {
            ...state.itemsById,
            [id]: { ...prev, qty, updatedAt: action.item.updatedAt, product: action.item.product },
          },
        };
      }
      return { ...state, itemsById: { ...state.itemsById, [id]: action.item } };
    }
    case "REMOVE": {
      if (!state.itemsById[action.id]) return state;
      const next = { ...state.itemsById };
      delete next[action.id];
      return { ...state, itemsById: next };
    }
    case "SET_QTY": {
      const it = state.itemsById[action.id];
      if (!it) return state;
      const qty = clampQty(action.qty);
      if (qty === it.qty) return state;
      const updatedAt = new Date().toISOString();
      return { ...state, itemsById: { ...state.itemsById, [action.id]: { ...it, qty, updatedAt } } };
    }
    case "CLEAR":
      return initialState;
    default:
      return state;
  }
}

async function safeLoad(): Promise<CartState | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CartState;
    if (!parsed || parsed.version !== 1) return null;
    if (!parsed.itemsById || typeof parsed.itemsById !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

async function safeSave(state: CartState) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage falhou: não derruba a UI
  }
}

const CartCtx = createContext<CartApi | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [hydrated, setHydrated] = useState(false);

  // Persistência com debounce
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedJson = useRef<string>("");

  const scheduleSave = useCallback((next: CartState) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(() => {
      const json = JSON.stringify(next);
      if (json === lastSavedJson.current) return;
      lastSavedJson.current = json;
      safeSave(next);
    }, 350);
  }, []);

  // Hydrate no boot
  useEffect(() => {
    let alive = true;
    (async () => {
      const loaded = await safeLoad();
      if (!alive) return;
      if (loaded) {
        dispatch({ type: "HYDRATE", state: loaded });
        lastSavedJson.current = JSON.stringify(loaded);
      }
      setHydrated(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Salva toda vez que o estado muda (debounced)
  useEffect(() => {
    if (!hydrated) return;
    scheduleSave(state);
  }, [hydrated, scheduleSave, state]);

  const items = useMemo(() => Object.values(state.itemsById), [state.itemsById]);

  // ===== Sync resiliente (outbox)
  const enqueue = useCallback(async (job: any) => {
    // Não trava UI. Enfileira e tenta flush quando online.
    await enqueueCartJob(job);
    const net = await NetInfo.fetch();
    if (net.isConnected) {
      // best-effort
      processCartOutboxOnce().catch(() => {});
    }
  }, []);

  const addItem = useCallback(
    (product: Product, qty: number = 1, opts?: { idKey?: string }) => {
      const id = String(opts?.idKey ?? product?.id ?? "");
      if (!id) return;
      const now = new Date().toISOString();
      const item: CartItem = { id, product, qty: clampQty(qty), addedAt: now, updatedAt: now };
      dispatch({ type: "ADD", item });

      // Sync (otimista)
      enqueue({ op: "ADD", id, qty: clampQty(qty), productId: product.id, at: now }).catch(() => {});
    },
    [enqueue]
  );

  const removeItem = useCallback(
    (id: string) => {
      const key = String(id ?? "");
      if (!key) return;
      dispatch({ type: "REMOVE", id: key });
      const at = new Date().toISOString();
      enqueue({ op: "REMOVE", id: key, at }).catch(() => {});
    },
    [enqueue]
  );

  const setQty = useCallback(
    (id: string, qty: number) => {
      const key = String(id ?? "");
      if (!key) return;
      const q = clampQty(qty);
      dispatch({ type: "SET_QTY", id: key, qty: q });
      const at = new Date().toISOString();
      // Coalescência simples: SET_QTY substitui a intenção anterior
      enqueue({ op: "SET_QTY", id: key, qty: q, at }).catch(() => {});
    },
    [enqueue]
  );


  // Compat: alguns pontos do app chamam métodos antigos.
  const add = useCallback(
    (product: Product) => {
      addItem(product, 1);
    },
    [addItem]
  );

  const remove = useCallback(
    (product: Product, qty: number = 1) => {
      const id = String((product as any)?.id ?? "");
      if (!id) return;
      // remove "qty" vezes: aqui optamos por remover item inteiro (padrão marketplace).
      // Se desejar comportamento incremental, use decItem.
      removeItem(id);
    },
    [removeItem]
  );

  const decItem = useCallback(
    (product: Product, qty: number = 1) => {
      const id = String((product as any)?.id ?? "");
      if (!id) return;
      const current = state.itemsById[id];
      if (!current) return;
      const nextQty = clampQty(current.qty - Math.max(1, Math.floor(Number(qty) || 1)));
      if (nextQty <= 1) {
        // Mantém mínimo 1; para remover, usa removeItem
        setQty(id, 1);
      } else {
        setQty(id, nextQty);
      }
    },
    [setQty, state.itemsById]
  );


  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR" });
    const at = new Date().toISOString();
    enqueue({ op: "CLEAR", at }).catch(() => {});
  }, [enqueue]);

  const clear = useCallback(() => clearCart(), [clearCart]);
  const reset = useCallback(() => clearCart(), [clearCart]);

  const flushSyncOnce = useCallback(async () => {
    await processCartOutboxOnce();
  }, []);

  const api = useMemo<CartApi>(
    () => ({ items, hydrated, addItem, removeItem, setQty, clearCart, flushSyncOnce, add, remove, decItem, clear, reset }),
    [items, hydrated, addItem, removeItem, setQty, clearCart, flushSyncOnce]
  );

  return <CartCtx.Provider value={api}>{children}</CartCtx.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartCtx);
  if (!ctx) {
    // Fail-safe: evita crash em runtime; ajuda a detectar provider ausente.
    return {
      items: [],
      hydrated: false,
      addItem: () => {},
      removeItem: () => {},
      setQty: () => {},
      clearCart: () => {},
      flushSyncOnce: async () => {},
      add: () => {},
      remove: () => {},
      decItem: () => {},
      clear: () => {},
      reset: () => {},
    };
  }
  return ctx;
}
