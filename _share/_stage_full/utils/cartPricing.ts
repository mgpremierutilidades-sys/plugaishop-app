// utils/cartPricing.ts
import { clampCents, fromCents, moneyMinCents, roundPercentOfCents, toCents } from "./money";

export type CouponLike =
  | { code?: string; type: "percent"; value: number }
  | { code?: string; type: "fixed"; value: number }
  | { code?: string; type: "free_shipping"; value?: 0 };

export type CartPricingRow = {
  id: string;
  price: number;
  qty: number;
  discountPercent?: number;
};

export type ShippingMethod = "delivery" | "pickup";

export type CartPricingInput = {
  rows: CartPricingRow[];
  selectedById: Record<string, boolean> | null | undefined;

  coupon: CouponLike | null | undefined;

  shippingMethod: ShippingMethod;
  cep8: string;
  freeShippingThreshold: number;

  /**
   * Deve retornar valor (R$) do frete para o CEP (já normalizado com 8 dígitos).
   * Mantém o comportamento atual do carrinho (mock/estimativa).
   */
  estimateShipping: (cep8: string) => number;

  /**
   * Garantia/Proteção estendida:
   * - `protectionById[id] = months` (ex.: 12/24)
   * - `buildProtectionPlans(unitFinal)` deve devolver os planos com preço (R$)
   * - `calcUnitWithProductDiscount(unit, pct)` deve retornar unitário após desconto do produto (R$)
   */
  protectionById?: Record<string, number | undefined>;
  buildProtectionPlans?: (unitFinal: number) => { months: number; price: number }[];
  calcUnitWithProductDiscount?: (unit: number, discountPercent?: number) => number;
};

export type FreeShippingProgress = { ratio: number; missing: number; reached: boolean };

export type CartPricingOutput = {
  subtotalRaw: number;

  productDiscountTotal: number;
  subtotalAfterProductDiscount: number;

  couponDiscount: number;
  discountTotal: number;

  protectionTotal: number;

  shippingEstimated: number;
  total: number;

  freeShippingProgress: FreeShippingProgress;

  // métricas úteis para debug/telemetria
  selectedCount: number;
  selectedQty: number;
};

function safeId(v: unknown): string {
  return String(v ?? "");
}

function safeMoney(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  return Number.isFinite(v) ? v : 0;
}

function safePct(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return v;
}

/**
 * Engine determinístico de pricing (Etapa 20)
 * - centavos (inteiro) -> evita divergência em subtotal/desconto/total
 * - não depende de UI
 */
export function computeCartPricing(input: CartPricingInput): CartPricingOutput {
  const rows = Array.isArray(input.rows) ? input.rows : [];
  const selected = input.selectedById ?? {};
  const coupon = input.coupon ?? null;

  const freeThresholdCents = toCents(input.freeShippingThreshold);

  let subtotalCents = 0;
  let productDiscountCents = 0;
  let selectedCount = 0;
  let selectedQty = 0;

  for (const r of rows) {
    const id = safeId(r?.id);
    if (!id) continue;
    if (!selected[id]) continue;

    selectedCount += 1;

    const qty = Math.max(1, Math.floor(safeMoney(r?.qty ?? 1)));
    selectedQty += qty;

    const unitCents = toCents(safeMoney(r?.price));
    subtotalCents += unitCents * qty;

    const pct = safePct((r as any)?.discountPercent);
    if (pct > 0) {
      const unitDiscountCents = roundPercentOfCents(unitCents, pct);
      productDiscountCents += unitDiscountCents * qty;
    }
  }

  subtotalCents = clampCents(subtotalCents);
  productDiscountCents = moneyMinCents(productDiscountCents, subtotalCents);

  const subtotalAfterProductDiscountCents = clampCents(subtotalCents - productDiscountCents);

  // Cupom
  let couponDiscountCents = 0;

  if (coupon && coupon.type !== "free_shipping") {
    if (coupon.type === "percent") {
      const pct = safePct(coupon.value);
      couponDiscountCents = roundPercentOfCents(subtotalAfterProductDiscountCents, pct);
    } else if (coupon.type === "fixed") {
      const fixedCents = toCents(safeMoney(coupon.value));
      couponDiscountCents = fixedCents;
    }
  }

  // Regra marketplace: desconto não pode ultrapassar subtotal do produto
  couponDiscountCents = moneyMinCents(couponDiscountCents, subtotalAfterProductDiscountCents);

  const discountTotalCents = clampCents(productDiscountCents + couponDiscountCents);

  // Proteção estendida
  let protectionCents = 0;

  if (input.protectionById && input.buildProtectionPlans && input.calcUnitWithProductDiscount) {
    const protectionById = input.protectionById;

    for (const r of rows) {
      const id = safeId(r?.id);
      if (!id) continue;
      if (!selected[id]) continue;

      const months = protectionById[id];
      if (!months) continue;

      const unit = safeMoney(r?.price);
      const pct = safePct((r as any)?.discountPercent);
      const unitFinal = input.calcUnitWithProductDiscount(unit, pct);

      const plans = input.buildProtectionPlans(unitFinal);
      const plan = plans.find((p) => p.months === months) ?? null;
      if (!plan) continue;

      protectionCents += toCents(safeMoney(plan.price));
    }
  }

  protectionCents = clampCents(protectionCents);

  // Frete
  let shippingCents = 0;
  const hasSelection = selectedCount > 0;

  if (hasSelection && input.shippingMethod !== "pickup") {
    const freeByCoupon = coupon?.type === "free_shipping";
    const freeByThreshold = freeThresholdCents > 0 && subtotalAfterProductDiscountCents >= freeThresholdCents;

    if (!freeByCoupon && !freeByThreshold) {
      const v = safeMoney(input.estimateShipping(input.cep8));
      shippingCents = toCents(v);
    }
  }

  shippingCents = clampCents(shippingCents);

  // Total final
  const totalCents = clampCents(subtotalAfterProductDiscountCents - couponDiscountCents + shippingCents + protectionCents);

  // Progresso de frete grátis (base: subtotal após desconto do produto)
  const baseForProgressCents = subtotalAfterProductDiscountCents;
  const ratio =
    freeThresholdCents <= 0 ? 0 : Math.min(1, baseForProgressCents / Math.max(1, freeThresholdCents));
  const missingCents = clampCents(freeThresholdCents - baseForProgressCents);

  return {
    subtotalRaw: fromCents(subtotalCents),

    productDiscountTotal: fromCents(productDiscountCents),
    subtotalAfterProductDiscount: fromCents(subtotalAfterProductDiscountCents),

    couponDiscount: fromCents(couponDiscountCents),
    discountTotal: fromCents(discountTotalCents),

    protectionTotal: fromCents(protectionCents),

    shippingEstimated: fromCents(shippingCents),
    total: fromCents(totalCents),

    freeShippingProgress: {
      ratio,
      missing: fromCents(missingCents),
      reached: freeThresholdCents > 0 ? baseForProgressCents >= freeThresholdCents : false,
    },

    selectedCount,
    selectedQty,
  };
}
