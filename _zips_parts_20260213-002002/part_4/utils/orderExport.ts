import type { Order } from "../types/order";
import { buildOrderPayload } from "./orderPayloadBuilder";
import { toBlingPayload } from "./blingPayload";
import { toNuvemshopPayload } from "./nuvemshopPayload";

export function exportOrder(order: Order) {
  const canonical = buildOrderPayload(order);

  return {
    canonical,
    bling: toBlingPayload(canonical),
    nuvemshop: toNuvemshopPayload(canonical),
  };
}
