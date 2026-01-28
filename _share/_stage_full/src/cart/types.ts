// src/cart/types.ts
import type { ImageSourcePropType } from "react-native";
import type { Product } from "../../data/catalog";

export type Coupon =
  | { code: string; type: "percent"; value: number; label: string }
  | { code: string; type: "fixed"; value: number; label: string }
  | { code: string; type: "free_shipping"; value: 0; label: string };

export type ShippingMethod = "delivery" | "pickup";

export type CartRow = {
  type: "cart";
  id: string;
  title: string;
  price: number;
  qty: number;
  image?: ImageSourcePropType;
  discountPercent?: number;
  unitLabel?: string;
  product: Product;
};

export type DealRow = {
  type: "deal";
  id: string;
  title: string;
  price: number;
  image?: ImageSourcePropType;
  discountPercent?: number;
};

export type SummaryRow = { type: "summary"; id: "summary" };
export type RecoRow = { type: "reco"; id: "reco" };
export type SavedRow = { type: "saved"; id: "saved" };

export type Row = CartRow | DealRow | SummaryRow | RecoRow | SavedRow;

export type CartSection = {
  title: string;
  data: Row[];
};

export type SavedItem = {
  id: string;
  title: string;
  price: number;
  qty: number;
  image?: ImageSourcePropType;
  discountPercent?: number;
  unitLabel?: string;
};

export type ProtectionPlan = {
  months: number;
  price: number;
  installments: number;
  recommended?: boolean;
};
