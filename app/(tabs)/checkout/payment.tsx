// app/(tabs)/checkout/payment.tsx
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import theme from "../../../constants/theme";
import type { OrderDraft } from "../../../types/order";
import { loadOrderDraft, saveOrderDraft } from "../../../utils/orderStorage";

function formatBRL(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  return `R$ ${n.toFixed(2)}`.replace(".", ",");
}

export default function Payment() {
  const [order, setOrder] = useState<OrderDraft | null>(null);
  const subtotal = useMemo(() => Number(order?.subtotal ?? 0), [order]);
  const shippingPrice = useMemo(() => Number(order?.shipping?.price ?? 0), [order]);
  const total = useMemo(() => subtotal + shippingPrice, [subtotal, shippingPrice]);

  useEffect(() => {
    loadOrderDraft().then((o) => setOrder(o));
  }, []);

  async function handleContinue() {
    if (!order) return;
    await saveOrderDraft({
      ...order,
      payment: { method: "pix", status: "pending" },
    });
    router.push("/checkout/review" as any);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: "700", color: theme.colors.text }}>
          Pagamento
        </Text>

        <View style={{ marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: theme.colors.surface }}>
          <Text style={{ color: theme.colors.text, fontWeight: "600" }}>Resumo</Text>
          <Text style={{ marginTop: 8, color: theme.colors.muted }}>
            Subtotal: {formatBRL(subtotal)}
          </Text>
          <Text style={{ marginTop: 4, color: theme.colors.muted }}>
            Frete: {formatBRL(shippingPrice)}
          </Text>
          <Text style={{ marginTop: 8, color: theme.colors.text, fontWeight: "700" }}>
            Total: {formatBRL(total)}
          </Text>
        </View>

        <View style={{ marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: theme.colors.surface }}>
          <Text style={{ color: theme.colors.text, fontWeight: "600" }}>Método</Text>
          <Text style={{ marginTop: 8, color: theme.colors.muted }}>
            Pix (mock)
          </Text>
        </View>

        <Pressable
          onPress={handleContinue}
          style={{
            marginTop: 24,
            backgroundColor: theme.colors.primary,
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>Continuar</Text>
        </Pressable>
      </View>
    </View>
  );
}