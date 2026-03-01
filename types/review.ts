export type Review = {
  id: string;
  productId: string;
  userName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  createdAtIso: string;
  verifiedPurchase: boolean;
};