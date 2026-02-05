import type { ImageSourcePropType } from "react-native";

export type CartPricingRow = {
  id: string;
  price: number;
  qty: number;
  discountPercent?: number;
};

export type Coupon =
  | { code: string; type: "percent"; value: number; label: string }
  | { code: string; type: "fixed"; value: number; label: string }
  | { code: string; type: "free_shipping"; value: 0; label: string };

export type ShippingMethod = "delivery" | "pickup";

export type CartPricingInput = {
  rows: CartPricingRow[];
  selectedById: Record<string, boolean>;

  coupon: Coupon | null;

  shippingMethod: ShippingMethod;
  cep8: string;
  freeShippingThreshold: number;

  // ✅ ESLint: prefixo "_" em params de type signatures
  estimateShipping: (_cep8: string) => number;

  protectionById: Record<string, number | undefined>;
  buildProtectionPlans: (_unitFinal: number) => Array<{ months: number; price: number; installments: number }>;

  calcUnitWithProductDiscount: (_unit: number, _discountPercent?: number) => number;
};

export type CartPricingOutput = {
  subtotalSelected: number;
  discountTotal: number;
  shippingEstimated: number;
  protectionTotal: number;
  total: number;

  freeShippingProgress: { reached: boolean; remaining: number; threshold: number };
};

function round2(v: number) {
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 100) / 100;
}

function clampMoney(v: number) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, v);
}

export function toImageSource(uri?: string): ImageSourcePropType | undefined {
  const u = String(uri ?? "").trim();
  if (!u) return undefined;
  return { uri: u } as ImageSourcePropType;
}

export function computeCartPricing(input: CartPricingInput): CartPricingOutput {
  const rows = Array.isArray(input.rows) ? input.rows : [];
  const selectedById = input.selectedById ?? {};
  const coupon = input.coupon ?? null;

  let subtotalSelected = 0;

  // soma itens selecionados (já com desconto do produto)
  for (const r of rows) {
    if (!selectedById[r.id]) continue;
    const unitFinal = clampMoney(input.calcUnitWithProductDiscount(r.price, r.discountPercent));
    subtotalSelected += unitFinal * Math.max(1, Math.floor(r.qty || 1));
  }
  subtotalSelected = round2(subtotalSelected);

  // cupom
  let discountTotal = 0;
  if (coupon) {
    if (coupon.type === "percent") {
      discountTotal = round2((subtotalSelected * clampMoney(coupon.value)) / 100);
    } else if (coupon.type === "fixed") {
      discountTotal = round2(Math.min(subtotalSelected, clampMoney(coupon.value)));
    } else {
      discountTotal = 0;
    }
  }

  const afterDiscount = round2(clampMoney(subtotalSelected - discountTotal));

  // proteção estendida
  let protectionTotal = 0;
  for (const r of rows) {
    if (!selectedById[r.id]) continue;
    const months = input.protectionById?.[r.id];
    if (!months) continue;

    const unitFinal = clampMoney(input.calcUnitWithProductDiscount(r.price, r.discountPercent));
    const plans = input.buildProtectionPlans(unitFinal);
    const plan = plans.find((p) => p.months === months);
    if (!plan) continue;

    protectionTotal += clampMoney(plan.price);
  }
  protectionTotal = round2(protectionTotal);

  // frete
  let shippingEstimated = 0;
  if (input.shippingMethod === "delivery") {
    const threshold = clampMoney(input.freeShippingThreshold);
    const reached = afterDiscount >= threshold;

    if (!reached && coupon?.type === "free_shipping") {
      shippingEstimated = 0;
    } else if (reached) {
      shippingEstimated = 0;
    } else {
      shippingEstimated = clampMoney(input.estimateShipping(input.cep8));
    }
  }

  shippingEstimated = round2(shippingEstimated);

  const total = round2(afterDiscount + protectionTotal + shippingEstimated);

  const threshold = clampMoney(input.freeShippingThreshold);
  const reached = afterDiscount >= threshold;
  const remaining = round2(Math.max(0, threshold - afterDiscount));

  return {
    subtotalSelected,
    discountTotal,
    shippingEstimated,
    protectionTotal,
    total,
    freeShippingProgress: { reached, remaining, threshold },
  };
}
