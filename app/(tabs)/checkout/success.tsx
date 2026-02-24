import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../../components/AppHeader";
import { isFlagEnabled } from "../../../constants/flags";
import theme from "../../../constants/theme";
import { track } from "../../../lib/analytics";
import { buildOrderFromDraft } from "../../../lib/orderFactory";
import type { OrderDraft } from "../../../types/order";
import { addNotification } from "../../../utils/notificationsStorage";
import { loadOrderDraft, saveOrderDraft } from "../../../utils/orderStorage";
import { addOrder } from "../../../utils/ordersStorage";

function formatBRL(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  return `R$ ${n.toFixed(2)}`.replace(".", ",");
}

function makeId(prefix = "ntf") {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${ts}_${rnd}`;
}

export default function Success() {
  const insets = useSafeAreaInsets();

  const [orderId, setOrderId] = useState<string>("");
  const [paidTotal, setPaidTotal] = useState<number>(0);

  useEffect(() => {
    let alive = true;

    (async () => {
      const d = (await loadOrderDraft()) as OrderDraft | null;
      if (!alive) return;

      // snapshot do total antes de limpar draft
      const totalSnapshot = Number(d?.total ?? 0);
      setPaidTotal(totalSnapshot);

      // rollback: se flag off, não persiste nada
      if (!d || !isFlagEnabled("ff_orders_v1")) {
        try {
          track("checkout_success", { persisted: false });
        } catch {}
        return;
      }

      const order = buildOrderFromDraft(d);

      try {
        await addOrder(order);
        setOrderId(order.id);

        // ✅ Notificação: Pedido criado (badge sobe automaticamente)
        if (isFlagEnabled("ff_orders_notifications_v1")) {
          const n = {
            id: makeId(),
            title: `Pedido ${order.id}`,
            body: "Pedido criado com sucesso.",
            createdAt: new Date().toISOString(),
            read: false,
            orderId: order.id,
            data: {
              type: "order_created",
              source: "checkout_success",
            },
          };

          await addNotification(n);

          try {
            track("order_notification_created", {
              order_id: order.id,
              type: "order_created",
              source: "checkout_success",
            });
          } catch {}
        }

        // Limpa draft: evita duplicação ao reabrir checkout
        await saveOrderDraft({
          ...d,
          id: order.id,
          items: [],
          subtotal: 0,
          discount: 0,
          total: 0,
          note: "",
          shipping: d.shipping,
          address: d.address,
          payment: d.payment,
        });

        try {
          track("order_created", {
            order_id: order.id,
            subtotal: order.subtotal,
            discount: order.discount ?? 0,
            shipping_price: order.shipping?.price ?? 0,
            total: order.total,
            items_count: order.items?.length ?? 0,
            payment_method: order.payment?.method ?? "unknown",
            payment_status: order.payment?.status ?? "pending",
          });
          track("checkout_success", { persisted: true, order_id: order.id });
        } catch {}
      } catch {
        try {
          track("checkout_success", { persisted: false, error: "persist_failed" });
        } catch {}
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  function goOrders() {
    try {
      router.push("/orders" as any);
    } catch {
      try {
        router.push("/(tabs)/orders" as any);
      } catch {}
    }
  }

  function goHome() {
    try {
      router.push("/(tabs)" as any);
    } catch {
      router.push("/" as any);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader title="Sucesso" showBack />

      <View
        style={{
          flex: 1,
          padding: 16,
          paddingTop: 12,
          paddingBottom: 16 + insets.bottom,
          gap: 12,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: "900", color: theme.colors.text }}>
          Pedido confirmado ✅
        </Text>

        <Text style={{ fontSize: 13, opacity: 0.75, color: theme.colors.text }}>
          {orderId ? `Pedido: ${orderId}` : "Seu pedido foi registrado."}
        </Text>

        <View
          style={{
            marginTop: 8,
            padding: 14,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.colors.divider,
            backgroundColor: theme.colors.surface,
            gap: 6,
          }}
        >
          <Text style={{ fontSize: 12, opacity: 0.75, color: theme.colors.text }}>
            Total pago
          </Text>
          <Text style={{ fontSize: 18, fontWeight: "900", color: theme.colors.text }}>
            {formatBRL(paidTotal)}
          </Text>
        </View>

        <Pressable
          onPress={goOrders}
          style={{
            marginTop: 8,
            borderWidth: 1,
            borderColor: theme.colors.divider,
            padding: 14,
            borderRadius: 12,
            backgroundColor: theme.colors.surface,
          }}
        >
          <Text style={{ textAlign: "center", fontWeight: "800", color: theme.colors.text }}>
            Ver meus pedidos
          </Text>
        </Pressable>

        <Pressable
          onPress={goHome}
          style={{
            backgroundColor: theme.colors.success,
            padding: 14,
            borderRadius: 12,
          }}
        >
          <Text style={{ textAlign: "center", fontWeight: "900", color: "#000" }}>
            Continuar comprando
          </Text>
        </Pressable>

        <Text style={{ fontSize: 12, opacity: 0.65, color: theme.colors.text }}>
          Dica: no V2 vamos mostrar tracking, nota fiscal e suporte por pedido.
        </Text>
      </View>
    </View>
  );
}