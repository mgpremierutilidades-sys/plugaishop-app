// constants/orders.ts

/**
 * Labels (PT-BR) para EXIBIÇÃO.
 * NÃO confundir com o status técnico (types/orderStatus.ts).
 */
export type OrderStatusLabel = "Confirmado" | "Pago" | "Enviado" | "Entregue";

export const ORDER_STATUS_LABELS: OrderStatusLabel[] = [
  "Confirmado",
  "Pago",
  "Enviado",
  "Entregue",
];
