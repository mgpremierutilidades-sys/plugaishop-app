// src/cart/useCartTotals.ts
import { useMemo } from "react";
import type { CartRow, Coupon, ShippingMethod } from "./types";
import {
  buildProtectionPlans,
  calcUnitWithProductDiscount,
  clampMoney,
  estimateShipping,
} from "./cartPricing";

type Params = {
  cartRows: CartRow[];
  selected: Record<string, boolean>;
  appliedCoupon: Coupon | null;
  shippingMethod: ShippingMethod;
  cep8: string;
  protectionById: Record<string, number | undefined>;
  freeShippingThreshold: number;
};

export function useCartTotals(params: Params) {
  const {
    cartRows,
    selected,
    appliedCoupon,
    shippingMethod,
    cep8,
    protectionById,
    freeShippingThreshold,
  } = params;

  const subtotalRaw = useMemo(() => {
    return cartRows.reduce((acc, r) => {
      if (!selected[r.id]) return acc;
      return acc + r.price * r.qty;
    }, 0);
  }, [cartRows, selected]);

  const productDiscountTotal = useMemo(() => {
    return cartRows.reduce((acc, r) => {
      if (!selected[r.id]) return acc;
      const pct = Number(r.discountPercent ?? 0);
      if (!Number.isFinite(pct) || pct <= 0) return acc;
      const dUnit = (r.price * pct) / 100;
      return acc + dUnit * r.qty;
    }, 0);
  }, [cartRows, selected]);

  const subtotalAfterProductDiscount = useMemo(() => {
    return clampMoney(subtotalRaw - productDiscountTotal);
  }, [subtotalRaw, productDiscountTotal]);

  const couponDiscount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.type === "free_shipping") return 0;

    if (appliedCoupon.type === "percent") {
      const pct = Number(appliedCoupon.value ?? 0);
      if (!Number.isFinite(pct) || pct <= 0) return 0;
      return clampMoney((subtotalAfterProductDiscount * pct) / 100);
    }

    if (appliedCoupon.type === "fixed") {
      const v = Number(appliedCoupon.value ?? 0);
      if (!Number.isFinite(v) || v <= 0) return 0;
      return clampMoney(v);
    }

    return 0;
  }, [appliedCoupon, subtotalAfterProductDiscount]);

  const discountTotal = useMemo(() => clampMoney(productDiscountTotal + couponDiscount), [productDiscountTotal, couponDiscount]);

  const protectionTotal = useMemo(() => {
    return cartRows.reduce((acc, r) => {
      if (!selected[r.id]) return acc;

      const months = protectionById[r.id];
      if (!months) return acc;

      const unit = Number(r.price ?? 0);
      const unitFinal = calcUnitWithProductDiscount(unit, r.discountPercent);
      const plans = buildProtectionPlans(unitFinal);
      const plan = plans.find((p) => p.months === months) ?? null;
      if (!plan) return acc;

      return acc + plan.price;
    }, 0);
  }, [cartRows, protectionById, selected]);

  const shippingEstimated = useMemo(() => {
    const hasCart = cartRows.length > 0;
    if (!hasCart) return 0;
    if (shippingMethod === "pickup") return 0;
    if (appliedCoupon?.type === "free_shipping") return 0;

    if (subtotalAfterProductDiscount >= freeShippingThreshold) return 0;

    return estimateShipping(cep8);
  }, [appliedCoupon, cep8, cartRows.length, shippingMethod, subtotalAfterProductDiscount, freeShippingThreshold]);

  const total = useMemo(() => {
    const t = subtotalAfterProductDiscount - couponDiscount + shippingEstimated + protectionTotal;
    return t < 0 ? 0 : t;
  }, [couponDiscount, shippingEstimated, subtotalAfterProductDiscount, protectionTotal]);

  const freeShippingProgress = useMemo(() => {
    const v = subtotalAfterProductDiscount;
    const ratio = freeShippingThreshold <= 0 ? 0 : Math.min(1, v / freeShippingThreshold);
    const missing = clampMoney(freeShippingThreshold - v);
    return { ratio, missing, reached: v >= freeShippingThreshold };
  }, [subtotalAfterProductDiscount, freeShippingThreshold]);

  return {
    subtotalRaw,
    productDiscountTotal,
    subtotalAfterProductDiscount,
    couponDiscount,
    discountTotal,
    protectionTotal,
    shippingEstimated,
    total,
    freeShippingProgress,

    // expõe helpers para manter a tela estável (sem duplicar lógica)
    helpers: {
      calcUnitWithProductDiscount,
      buildProtectionPlans,
    },
  };
}
