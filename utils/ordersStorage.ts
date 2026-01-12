// utils/ordersStorage.ts
// Ponte para compatibilidade com imports antigos.
// IMPORTANT: manter este arquivo como "bridge" de exports.

export {
  addLogisticsEvent, addOrder, addReturnAttachment, advanceOrderStatus, buildOrderSupportText, clearInvoice, clearLogisticsEvents, clearOrders, createOrder,
  createOrderFromCart,
  // Return
  createReturnRequest,
  // Notifications
  ensureNotificationsHydrated,
  // Orders core
  ensureOrdersHydrated, getOrderById, getOrders, getTrackingUrl, getUnreadNotificationsCount, listNotifications, listOrders, markAllNotificationsRead,
  markNotificationRead,
  // UI helpers
  normalizeStatusLabel, saveOrders,
  // Invoice
  setInvoiceMock,
  // Review
  setOrderReview, setOrders,
  // Tracking / logistics
  setTrackingCode, updateOrderStatus
} from "./ordersStore";

export type {
  Address, InAppNotification,
  LogisticsEvent,
  LogisticsEventType, Order,
  OrderItem,
  OrderStatus, PaymentMethod, ReturnType
} from "./ordersStore";

// Compat: se algum arquivo antigo importar patchOrderDraft daqui, continua funcionando:
export { patchOrderDraft } from "./patchOrderDraft";
