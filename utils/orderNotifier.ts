import type { Order } from "../types/order";
import type { OrderStatus } from "../types/orderStatus";
import { notifyLocal } from "./notifications";
import {
  getLastNotifiedStatus,
  setLastNotifiedStatus,
} from "./orderNotificationStorage";

function statusLabel(status: OrderStatus) {
  switch (status) {
    case "created":
      return "Pedido criado";
    case "payment_pending":
      return "Aguardando pagamento";
    case "paid":
      return "Pagamento aprovado";
    case "shipped":
      return "Enviado";
    case "delivered":
      return "Entregue";
    case "cancelled":
      return "Cancelado";
    default:
      return "Atualização";
  }
}

export async function notifyIfOrderStatusChanged(order: Order) {
  const last = await getLastNotifiedStatus(order.id);
  if (last === order.status) return;

  await notifyLocal(
    "Atualização do pedido",
    `Pedido ${order.id}: ${statusLabel(order.status)}`,
    { orderId: order.id, status: order.status }
  );

  await setLastNotifiedStatus(order.id, order.status);
}
