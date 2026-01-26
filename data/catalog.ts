// data/catalog.ts
// Fonte única de catálogo usada pelas telas (Cart, Explore, Product).
// Observação: este arquivo é criado para padronizar imports e evitar acoplamento direto em constants/*.

import { products as baseProducts, type Product as BaseProduct } from "../constants/products";

export type Product = {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  image?: string;
  unitLabel?: string;
  discountPercent?: number;
};

function mapProduct(p: BaseProduct): Product {
  return {
    id: String(p.id),
    title: String((p as any).title ?? (p as any).name ?? "Produto"),
    description: String(p.description ?? ""),
    category: String(p.category ?? ""),
    price: Number(p.price ?? 0),
    image: typeof (p as any).image === "string" ? (p as any).image : undefined,
    unitLabel: (p as any).unitLabel ? String((p as any).unitLabel) : undefined,
    discountPercent: Number((p as any).discountPercent ?? 0) || undefined,
  };
}

export const products: Product[] = (baseProducts ?? []).map(mapProduct);
