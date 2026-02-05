import { useMemo } from "react";
import { toImageSource } from "./cartPricing";

export type CartRow = {
  id: string;
  title: string;
  price: number;
  qty: number;
  imageSource?: ReturnType<typeof toImageSource>;
};

type InputItem = {
  id: string;
  title: string;
  price: number;
  qty: number;
  image?: string;
};

export function useCartRows(items: InputItem[]) {
  return useMemo<CartRow[]>(() => {
    const safe = Array.isArray(items) ? items : [];
    return safe.map((it) => ({
      id: String(it.id),
      title: String(it.title ?? "Produto"),
      price: Number(it.price ?? 0),
      qty: Math.max(1, Math.floor(Number(it.qty ?? 1))),
      imageSource: toImageSource(it.image),
    }));
  }, [items]);
}
