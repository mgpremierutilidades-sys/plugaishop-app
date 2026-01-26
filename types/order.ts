// types/order.ts

/**
 * Compatibilidade com utils/orderDraftBuilder.ts e fluxo antigo
 * - Exporta Address, Payment, Shipping
 * - OrderDraft inclui campos legados: subtotal/discount/total/note (opcionais)
 * - Mantém Etapa 21: coupon + pricing snapshot + selectedItemIds + protectionById
 */

export type Address = {
  fullName?: string;
  phone?: string;

  cep?: string;
  cep8?: string;

  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;

  city?: string;
  state?: string;

  reference?: string;
};

export type Payment = {
  method: "pix" | "card" | "boleto" | "cash" | "other";
  brand?: string; // ex: visa/master
  last4?: string;
  installments?: number;
};

export type Shipping = {
  method: "delivery" | "pickup";
  cep8: string;
  price: number;
  carrier?: string;
  etaDays?: number;
};

export type OrderItem = {
  id: string;
  title: string;
  price: number;
  qty: number;
  discountPercent?: number;
};

export type OrderCoupon =
  | { code: string; type: "percent"; value: number }
  | { code: string; type: "fixed"; value: number }
  | { code: string; type: "free_shipping"; value: 0 };

export type OrderPricingSnapshot = {
  subtotalRaw: number;
  productDiscountTotal: number;
  couponDiscount: number;
  protectionTotal: number;
  shippingEstimated: number;
  discountTotal: number;
  total: number;
};

export type OrderDraft = {
  /** Compat: alguns fluxos criam um draft com id */
  id?: string;

  /** versionamento do draft */
  v: 2;
  createdAt: string;

  items: OrderItem[];
  selectedItemIds: string[];

  coupon?: OrderCoupon | null;

  /** Compat: seu projeto pode estar usando Shipping/Address/Payment diretamente no draft */
  shipping?: Shipping | null;
  address?: Address | null;
  payment?: Payment | null;

  protectionById?: Record<string, number>;

  /**
   * Etapa 21 (novo): snapshot completo e determinístico.
   * Deve ser a source of truth do checkout quando existir.
   */
  pricing?: OrderPricingSnapshot;

  /** opcional: hash simples para debug/observabilidade */
  pricingHash?: string;

  /**
   * Campos legados (compat com orderDraftBuilder.ts)
   * Mantidos como opcionais para não quebrar código antigo.
   */
  subtotal?: number;
  discount?: number;
  total?: number;

  /** Observação/nota do pedido (campo legado) */
  note?: string;
};
