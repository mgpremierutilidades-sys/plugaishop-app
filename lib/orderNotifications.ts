import type { InAppNotification } from "../types/order";
import type { OrderStatus } from "../types/orderStatus";

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix = "ntf") {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${ts}_${rnd}`;
}

function statusLabel(st: OrderStatus) {
  switch (st) {
    case "created":
      return "Criado";
    case "payment_pending":
      return "Pagamento pendente";
    case "paid":
      return "Pago";
    case "processing":
      return "Processando";
    case "shipped":
      return "Enviado";
    case "delivered":
      return "Entregue";
    case "canceled":
    case "cancelled":
      return "Cancelado";
    default:
      return st;
  }
}

export function makeOrderStatusNotification(params: {
  orderId: string;
  from: OrderStatus;
  to: OrderStatus;
  source: "auto" | "dev";
}): InAppNotification {
  const fromLabel = statusLabel(params.from);
  const toLabel = statusLabel(params.to);

  return {
    id: makeId(),
    title: `Pedido ${params.orderId}`,
    body: `Status: ${fromLabel} → ${toLabel}`,
    createdAt: nowIso(),
    read: false,
    orderId: params.orderId,
    data: {
      type: "order_status_change",
      from: params.from,
      to: params.to,
      source: params.source,
    },
  };
}