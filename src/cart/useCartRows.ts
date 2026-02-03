// src/cart/useCartRows.ts
import { useMemo } from "react";
import type { CartItem } from "../../context/CartContext";
import type { CartRow } from "./types";
import { toImageSource } from "./cartPricing";

export function useCartRows(items: CartItem[]): CartRow[] {
  return useMemo(() => {
    return (items ?? []).map((it) => {
      const p = it.product;
      return {
        type: "cart",
        id: String(it.id),
        title: String(it.product?.title ?? p?.title ?? "Produto"),
        price: Number(it.product?.price ?? p?.price ?? 0),
        qty: Math.max(1, Number(it.qty ?? 1)),
        image: toImageSource(it.product?.image ?? (p as any)?.image),
        discountPercent: Number(it.product?.discountPercent ?? (p as any)?.discountPercent ?? 0) || undefined,
        unitLabel: String(it.product?.unitLabel ?? (p as any)?.unitLabel ?? "/ un"),
        product: p,
      };
    });
  }, [items]);
}
