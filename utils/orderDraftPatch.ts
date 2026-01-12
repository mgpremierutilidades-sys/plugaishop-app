// utils/orderDraftPatch.ts
// Bridge para compatibilidade (nome antigo). Não duplicar lógica aqui.
export type { Address, OrderDraft, Payment, Shipping } from "../types/order";
export { patchOrderDraft } from "./patchOrderDraft";

