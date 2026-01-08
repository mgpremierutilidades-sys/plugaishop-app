// utils/orderNotifier.ts
import type { OrderStatus } from "../types/orderStatus";
import { normalizeStatusLabel } from "./ordersStore";

export function getOrderStatusNotificationTitle(status: OrderStatus): string {
  // Mantém título humanizado em PT-BR
  return normalizeStatusLabel(status);
}

export function getOrderStatusNotificationBody(status: OrderStatus): string {
  switch (status) {
    case "paid":
      return "Pagamento aprovado.";
    case "shipped":
      return "Seu pedido foi enviado.";
    case "delivered":
      return "Seu pedido foi entregue.";
    case "payment_pending":
      return "Aguardando confirmação do pagamento.";
    case "processing":
      return "Seu pedido está em separação.";
    case "canceled":
      return "Seu pedido foi cancelado.";
    case "created":
    default:
      return "Pedido confirmado.";
  }
}
