import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../components/AppHeader";
import { isFlagEnabled } from "../../constants/flags";
import theme from "../../constants/theme";
import { track } from "../../lib/analytics";
import { subscribeNotificationsChanged } from "../../lib/notificationsBus";
import { maybeAutoProgressOrder } from "../../lib/orderAutoProgress";
import { makeOrderStatusNotification } from "../../lib/orderNotifications";
import type { InAppNotification, Order } from "../../types/order";
import {
  addNotification,
  getUnreadCount,
  listNotifications,
} from "../../utils/notificationsStorage";
import { clearOrders, listOrders, updateOrder } from "../../utils/ordersStorage";

function formatBRL(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  return `R$ ${n.toFixed(2)}`.replace(".", ",");
}

function statusLabel(st: string) {
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

function formatWhen(iso: string) {
  const s = String(iso ?? "");
  return s.slice(0, 19).replace("T", " ");
}

export default function OrdersTab() {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);

  const [inbox, setInbox] = useState<InAppNotification[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);

  const uiEnabled = isFlagEnabled("ff_orders_ui_v1");
  const autoEnabled = isFlagEnabled("ff_orders_autoprogress_v1");
  const notifEnabled = isFlagEnabled("ff_orders_notifications_v1");
  const devTools = isFlagEnabled("ff_dev_tools_v1");

  const inboxEnabled =
    notifEnabled && isFlagEnabled("ff_orders_notifications_inbox_v1");

  const refreshUnread = useCallback(async () => {
    if (!notifEnabled) {
      setUnread(0);
      return;
    }
    try {
      const c = await getUnreadCount();
      setUnread(c);
    } catch {
      setUnread(0);
    }
  }, [notifEnabled]);

  const refreshInbox = useCallback(async () => {
    if (!inboxEnabled) {
      setInbox([]);
      return;
    }
    setInboxLoading(true);
    try {
      const all = await listNotifications();
      const sorted = [...all].sort((a, b) =>
        String(b.createdAt).localeCompare(String(a.createdAt)),
      );
      setInbox(sorted.slice(0, 3));
    } catch {
      setInbox([]);
    } finally {
      setInboxLoading(false);
    }
  }, [inboxEnabled]);

  const load = useCallback(async () => {
    setLoading(true);

    let o = await listOrders();

    if (autoEnabled && o.length > 0) {
      let changed = 0;

      for (const it of o) {
        const before = it.status;
        const next = maybeAutoProgressOrder(it);

        if (next) {
          await updateOrder(next);
          changed++;

          if (notifEnabled) {
            const n = makeOrderStatusNotification({
              orderId: next.id,
              from: before,
              to: next.status,
              source: "auto",
            });

            await addNotification(n);

            try {
              track("order_notification_created", {
                order_id: next.id,
                from: before,
                to: next.status,
                source: "auto",
              });
            } catch {}
          }
        }
      }

      if (changed > 0) {
        o = await listOrders();
        try {
          track("order_autoprogress_tick", { scope: "orders_list", changed });
        } catch {}
      }
    }

    setOrders(o);
    setLoading(false);

    await refreshUnread();
    await refreshInbox();

    try {
      track("orders_list_view", { count: o.length });
      if (inboxEnabled) {
        track("orders_inbox_view", { unread_count: unread });
      }
    } catch {}
  }, [
    autoEnabled,
    notifEnabled,
    refreshInbox,
    refreshUnread,
    inboxEnabled,
    unread,
  ]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    if (!notifEnabled) return;

    const unsub = subscribeNotificationsChanged(() => {
      refreshUnread();
      refreshInbox();
    });

    return unsub;
  }, [notifEnabled, refreshUnread, refreshInbox]);

  const empty = useMemo(
    () => !loading && orders.length === 0,
    [loading, orders.length],
  );

  if (!uiEnabled) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          paddingTop: insets.top,
        }}
      >
        <AppHeader title="Pedidos" showBack={false as any} />
        <View style={{ padding: 16 }}>
          <Text
            style={{ fontSize: 18, fontWeight: "900", color: theme.colors.text }}
          >
            Em breve
          </Text>
          <Text
            style={{ marginTop: 8, opacity: 0.7, color: theme.colors.text }}
          >
            A área de pedidos está desativada no momento.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingTop: insets.top,
      }}
    >
      <AppHeader title="Pedidos" showBack={false as any} />

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 16 + insets.bottom,
          gap: 10,
        }}
      >
        {inboxEnabled ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: theme.colors.divider,
              borderRadius: 14,
              backgroundColor: theme.colors.surface,
              overflow: "hidden",
            }}
          >
            <Pressable
              onPress={() => {
                try {
                  track("orders_inbox_click", { target: "notifications_screen" });
                } catch {}
                router.push("/orders/notifications" as any);
              }}
              style={{
                padding: 12,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ fontWeight: "900", color: theme.colors.text }}>
                Notificações
              </Text>
              <Text
                style={{
                  fontWeight: "900",
                  color: unread > 0 ? theme.colors.primary : theme.colors.text,
                }}
              >
                {unread > 0 ? `${unread} novas` : "0"}
              </Text>
            </Pressable>

            {inboxLoading ? (
              <Text style={{ padding: 12, opacity: 0.7, color: theme.colors.text }}>
                Carregando inbox...
              </Text>
            ) : inbox.length === 0 ? (
              <Text style={{ padding: 12, opacity: 0.7, color: theme.colors.text }}>
                Sem notificações recentes.
              </Text>
            ) : (
              <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 8 }}>
                {inbox.map((n) => (
                  <Pressable
                    key={n.id}
                    onPress={() => {
                      try {
                        track("orders_inbox_item_open", {
                          id: n.id,
                          type: (n.data as any)?.type ?? "unknown",
                          order_id: n.orderId ?? null,
                        });
                      } catch {}

                      if (n.orderId) {
                        router.push(`/orders/${n.orderId}` as any);
                      } else {
                        router.push("/orders/notifications" as any);
                      }
                    }}
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: n.read
                        ? theme.colors.divider
                        : theme.colors.primary,
                      backgroundColor: theme.colors.background,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "900",
                        color: theme.colors.text,
                      }}
                    >
                      {n.title}
                    </Text>
                    <Text
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        opacity: 0.8,
                        color: theme.colors.text,
                      }}
                    >
                      {n.body}
                    </Text>
                    <Text
                      style={{
                        marginTop: 4,
                        fontSize: 11,
                        opacity: 0.6,
                        color: theme.colors.text,
                      }}
                    >
                      {formatWhen(n.createdAt)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {loading ? (
          <Text style={{ fontSize: 14, opacity: 0.7, color: theme.colors.text }}>
            Carregando pedidos...
          </Text>
        ) : null}

        {empty ? (
          <View
            style={{
              padding: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.colors.divider,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "900", color: theme.colors.text }}>
              Nenhum pedido ainda
            </Text>
            <Text style={{ marginTop: 6, opacity: 0.7, color: theme.colors.text }}>
              Quando você finalizar uma compra, seus pedidos aparecem aqui.
            </Text>

            <Pressable
              onPress={() => router.push("/(tabs)" as any)}
              style={{
                marginTop: 12,
                backgroundColor: theme.colors.success,
                padding: 12,
                borderRadius: 12,
              }}
            >
              <Text style={{ textAlign: "center", fontWeight: "900", color: "#000" }}>
                Começar a comprar
              </Text>
            </Pressable>
          </View>
        ) : null}

        {!loading
          ? orders.map((o) => {
              const total = Number(o.total ?? 0);
              const last = o.timeline?.length ? o.timeline[o.timeline.length - 1] : null;
              const when = last?.date ?? o.createdAt;

              return (
                <Pressable
                  key={o.id}
                  onPress={() => router.push(`/orders/${o.id}` as any)}
                  style={({ pressed }) => [
                    {
                      padding: 14,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: theme.colors.divider,
                      backgroundColor: theme.colors.surface,
                      opacity: pressed ? 0.95 : 1,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 12, opacity: 0.75, color: theme.colors.text }}>
                    Pedido
                  </Text>

                  <Text style={{ fontSize: 14, fontWeight: "900", color: theme.colors.text }}>
                    {o.id}
                  </Text>

                  <View style={{ marginTop: 8, flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 12, opacity: 0.75, color: theme.colors.text }}>
                      Status: {statusLabel(o.status)}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: "900", color: theme.colors.text }}>
                      {formatBRL(total)}
                    </Text>
                  </View>

                  <Text style={{ marginTop: 6, fontSize: 12, opacity: 0.65, color: theme.colors.text }}>
                    Atualizado: {formatWhen(when)}
                  </Text>

                  <Text style={{ marginTop: 10, fontSize: 12, fontWeight: "900", color: theme.colors.primary }}>
                    Ver detalhes →
                  </Text>
                </Pressable>
              );
            })
          : null}

        {devTools && !loading && orders.length > 0 ? (
          <Pressable
            onPress={async () => {
              try {
                track("dev_tools_used", { action: "clear_orders" });
              } catch {}
              await clearOrders();
              await load();
            }}
            style={{
              marginTop: 6,
              borderWidth: 1,
              borderColor: theme.colors.divider,
              padding: 12,
              borderRadius: 12,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Text style={{ textAlign: "center", fontWeight: "800", color: theme.colors.text }}>
              (DEV) Limpar pedidos
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}