import type { Review } from "../types/review";

export const reviews: Review[] = [
  {
    id: "rev_001",
    productId: "prod_001",
    userName: "Ana",
    rating: 5,
    text: "Chegou rápido e a qualidade é ótima.",
    createdAtIso: "2026-02-10T12:00:00Z",
    verifiedPurchase: true
  },
  {
    id: "rev_002",
    productId: "prod_002",
    userName: "Carlos",
    rating: 4,
    text: "Bom custo-benefício. Recomendo.",
    createdAtIso: "2026-02-12T16:20:00Z",
    verifiedPurchase: false
  },
  {
    id: "rev_003",
    productId: "prod_003",
    userName: "Marina",
    rating: 5,
    text: "Excelente! Compraria novamente.",
    createdAtIso: "2026-02-15T09:10:00Z",
    verifiedPurchase: true
  }
];