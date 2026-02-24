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
import { loadOrderDraft, saveOrderDraft } from "../../../utils/orderStorage";
import { addOrder } from "../../../utils/ordersStorage";

function formatBRL(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  return `R$ ${n.toFixed(2)}`.replace(".", ",");
}

export default function Success() {
  const insets = useSafeAreaInsets();

  const [draft, setDraft] = useState<OrderDraft | null>(null);
  const [orderId, setOrderId] = useState<string>("");

  useEffect(() => {
    let alive = true;

    (async () => {
      const d = await loadOrderDraft();
      if (!alive) return;

      setDraft(d ?? null);

      // Rollback: se flag off, não persiste nada
      if (!d || !isFlagEnabled("ff_orders_v1")) {
        try {
          track("checkout_success", { persisted: false });
        } catch {}
        return;
      }

      // Constrói e persiste pedido
      const order = buildOrderFromDraft(d);

      try {
        await addOrder(order);
        setOrderId(order.id);

        // Limpa draft: marca como "finalizado" e remove itens (evita duplicação)
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
            discount: order.discount,
            shipping_price: order.shipping?.price ?? 0,
            total: order.total,
            items_count: order.items?.length ?? 0,
            payment_method: order.payment?.method ?? "unknown",
            payment_status: order.payment?.status ?? "pending",
          });
          track("checkout_success", { persisted: true, order_id: order.id });
        } catch {}
      } catch {
        // Se falhar persistência, ainda mantém sucesso, mas registra
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
    // Se você tiver /orders index route
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

  const total = draft?.total ?? 0;

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
            {formatBRL(total)}
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