import type { Order, OrderStatus } from "../types/order";
import { notifyLocal } from "./notifications";
import { getLastNotifiedStatus, setLastNotifiedStatus } from "./orderNotificationStorage";

function statusLabel(status: OrderStatus) {
  switch (status) {
    case "processing":
      return "Processando";
    case "paid":
      return "Pagamento aprovado";
    case "shipped":
      return "Enviado";
    case "delivered":
      return "Entregue";
    case "canceled":
      return "Cancelado";
    default:
      return "Atualização";
  }
}

export async function notifyIfOrderStatusChanged(order: Order) {
  const last = await getLastNotifiedStatus(order.id);
  if (last === order.status) return;

  await notifyLocal({
    title: "Atualização do pedido",
    body: `Pedido ${order.id}: ${statusLabel(order.status)}`,
    data: { orderId: order.id, status: order.status },
  });

  await setLastNotifiedStatus(order.id, order.status);
}
