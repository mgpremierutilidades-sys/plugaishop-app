export type OrderStatus =
  | "created"
  | "payment_pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  created: "Pedido criado",
  payment_pending: "Aguardando pagamento",
  paid: "Pagamento aprovado",
  processing: "Em separação",
  shipped: "Enviado",
  delivered: "Entregue",
};

export type OrderTimelineEvent = {
  status: OrderStatus;
  date: string; // ISO
};
