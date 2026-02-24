import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../components/AppHeader";
import { isFlagEnabled } from "../../constants/flags";
import theme from "../../constants/theme";
import { track } from "../../lib/analytics";
import { maybeAutoProgressOrder } from "../../lib/orderAutoProgress";
import { makeOrderStatusNotification } from "../../lib/orderNotifications";
import { advanceOrderStatus } from "../../lib/orderProgress";
import type { Order } from "../../types/order";
import { addNotification } from "../../utils/notificationsStorage";
import { getOrderById, updateOrder } from "../../utils/ordersStorage";

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

export default function OrderDetails() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const id = String((params as any)?.id ?? "");

  const uiEnabled = isFlagEnabled("ff_orders_ui_v1");
  const progressEnabled = isFlagEnabled("ff_orders_progress_v1");
  const autoEnabled = isFlagEnabled("ff_orders_autoprogress_v1");
  const notifEnabled = isFlagEnabled("ff_orders_notifications_v1");
  const devTools = isFlagEnabled("ff_dev_tools_v1");

  const [order, setOrder] = useState<Order | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!uiEnabled) return;
      const o = await getOrderById(id);
      if (!alive) return;

      // Auto tick no detalhe
      if (autoEnabled && o) {
        const before = o.status;
        const next = maybeAutoProgressOrder(o);

        if (next) {
          await updateOrder(next);

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

          try {
            track("order_autoprogress_tick", {
              scope: "order_detail",
              order_id: next.id,
              from: before,
              to: next.status,
            });
          } catch {}

          setOrder(next);
        } else {
          setOrder(o);
        }
      } else {
        setOrder(o);
      }

      try {
        track("order_detail_view", { order_id: id, found: !!o });
      } catch {}
    })();

    return () => {
      alive = false;
    };
  }, [id, uiEnabled, autoEnabled, notifEnabled]);

  const timeline = useMemo(() => order?.timeline ?? [], [order]);

  async function handleCopyId() {
    if (!order?.id) return;
    await Clipboard.setStringAsync(order.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  async function handleAdvanceStatusDev() {
    if (!order) return;
    if (!progressEnabled) return;
    if (!devTools) return;
    if (busy) return;

    setBusy(true);
    try {
      const before = order.status;
      const next = advanceOrderStatus(order);
      if (next.status === before) return;

      await updateOrder(next);
      setOrder(next);

      if (notifEnabled) {
        const n = makeOrderStatusNotification({
          orderId: next.id,
          from: before,
          to: next.status,
          source: "dev",
        });
        await addNotification(n);
        try {
          track("order_notification_created", {
            order_id: next.id,
            from: before,
            to: next.status,
            source: "dev",
          });
        } catch {}
      }

      try {
        track("dev_tools_used", { action: "advance_status", order_id: next.id });
      } catch {}

      try {
        track("order_status_advance", {
          order_id: next.id,
          from: before,
          to: next.status,
          timeline_len: next.timeline?.length ?? 0,
        });
      } catch {}
    } finally {
      setBusy(false);
    }
  }

  if (!uiEnabled) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top }}>
        <AppHeader title="Pedido" showBack />
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: "900", color: theme.colors.text }}>Em breve</Text>
          <Text style={{ marginTop: 8, opacity: 0.7, color: theme.colors.text }}>
            A tela de pedido está desativada.
          </Text>
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top }}>
        <AppHeader title="Pedido" showBack />
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 16, color: theme.colors.text }}>Pedido não encontrado.</Text>

          <Pressable
            onPress={() => router.back()}
            style={{
              marginTop: 14,
              borderWidth: 1,
              borderColor: theme.colors.divider,
              padding: 12,
              borderRadius: 12,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Text style={{ textAlign: "center", fontWeight: "800", color: theme.colors.text }}>
              Voltar
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const itemsCount = order.items?.length ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top }}>
      <AppHeader title="Detalhe do Pedido" showBack />

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 16 + insets.bottom,
          gap: 12,
        }}
      >
        <View
          style={{
            padding: 14,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.colors.divider,
            backgroundColor: theme.colors.surface,
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 12, opacity: 0.75, color: theme.colors.text }}>Pedido</Text>
          <Text style={{ fontSize: 14, fontWeight: "900", color: theme.colors.text }}>{order.id}</Text>

          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 12, opacity: 0.75, color: theme.colors.text }}>
              Status: {statusLabel(order.status)}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: "900", color: theme.colors.text }}>
              {formatBRL(Number(order.total ?? 0))}
            </Text>
          </View>

          <Text style={{ fontSize: 12, opacity: 0.65, color: theme.colors.text }}>
            Itens: {itemsCount}
          </Text>

          <Pressable
            onPress={handleCopyId}
            style={{
              marginTop: 6,
              borderWidth: 1,
              borderColor: theme.colors.divider,
              padding: 12,
              borderRadius: 12,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Text style={{ textAlign: "center", fontWeight: "900", color: theme.colors.text }}>
              {copied ? "Copiado ✓" : "Copiar ID do pedido"}
            </Text>
          </Pressable>

          {/* DEV tools: avançar status */}
          {devTools && progressEnabled ? (
            <Pressable
              onPress={handleAdvanceStatusDev}
              disabled={busy}
              style={{
                marginTop: 10,
                backgroundColor: "#EEF1F5",
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.colors.divider,
                opacity: busy ? 0.6 : 1,
              }}
            >
              <Text style={{ textAlign: "center", fontWeight: "900", color: "#000" }}>
                {busy ? "Avançando..." : "(DEV) Avançar status"}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View
          style={{
            padding: 14,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.colors.divider,
            backgroundColor: theme.colors.surface,
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "900", color: theme.colors.text }}>
            Timeline
          </Text>

          {timeline.length === 0 ? (
            <Text style={{ fontSize: 12, opacity: 0.7, color: theme.colors.text }}>
              Sem eventos ainda.
            </Text>
          ) : (
            timeline.map((ev, idx) => (
              <View
                key={idx}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.colors.divider,
                  backgroundColor: theme.colors.background,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "900", color: theme.colors.text }}>
                  {statusLabel(ev.status)}
                </Text>
                <Text style={{ marginTop: 4, fontSize: 12, opacity: 0.7, color: theme.colors.text }}>
                  {String(ev.date).slice(0, 19).replace("T", " ")}
                </Text>
              </View>
            ))
          )}
        </View>

        <Pressable
          onPress={() => router.push("/orders/notifications" as any)}
          style={{
            borderWidth: 1,
            borderColor: theme.colors.divider,
            padding: 12,
            borderRadius: 12,
            backgroundColor: theme.colors.surface,
          }}
        >
          <Text style={{ textAlign: "center", fontWeight: "900", color: theme.colors.text }}>
            Ver notificações
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}