// src/cart/cartPricing.ts
import { Vibration, type ImageSourcePropType } from "react-native";
import type { ProtectionPlan } from "./types";

export function clampMoney(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

export function roundToCents(n: number) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function normalizeCep(raw: string) {
  return String(raw ?? "").replace(/\D+/g, "").slice(0, 8);
}

export function estimateShipping(cep8: string): number {
  if (!cep8 || cep8.length !== 8) return 0;

  const prefix2 = cep8.slice(0, 2);
  const p2 = Number(prefix2);

  if (prefix2 === "74" || prefix2 === "75") return 9.9;
  if (p2 >= 1 && p2 <= 19) return 14.9;
  if (p2 >= 20 && p2 <= 39) return 19.9;
  return 24.9;
}

export function calcUnitWithProductDiscount(unit: number, discountPercent?: number) {
  const pct = Number(discountPercent ?? 0);
  if (!Number.isFinite(pct) || pct <= 0) return unit;
  const discounted = unit * (1 - pct / 100);
  return clampMoney(discounted);
}

// Precificação simples de proteção (UX)
export function buildProtectionPlans(unitFinal: number): ProtectionPlan[] {
  const u = clampMoney(unitFinal);

  const p12 = roundToCents(Math.min(Math.max(u * 0.13, 9.9), 399));
  const p24 = roundToCents(Math.min(Math.max(u * 0.18, 14.9), 549));

  return [
    { months: 12, price: p12, installments: 10, recommended: true },
    { months: 24, price: p24, installments: 12 },
  ];
}

// microfeedback nativo (sem dependência extra)
export function softHaptic() {
  try {
    Vibration.vibrate(8);
  } catch {
    // noop
  }
}

export function toImageSource(img: unknown): ImageSourcePropType | undefined {
  if (!img) return undefined;
  if (typeof img === "number") return img;
  if (typeof img === "string") {
    if (img.startsWith("http")) return { uri: img };
    return undefined;
  }
  return img as ImageSourcePropType;
}
