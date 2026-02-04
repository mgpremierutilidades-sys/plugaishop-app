export type CartPricingItem = {
  price: number;
  qty: number;
};

export function calcCartSubtotal(items: CartPricingItem[]): number {
  return items.reduce((sum, it) => sum + it.price * it.qty, 0);
}
