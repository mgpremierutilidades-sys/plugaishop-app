// app/checkout/review.tsx
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../components/AppHeader";
import theme from "../../constants/theme";
import type { OrderDraft } from "../../types/order";
import { patchOrderDraft } from "../../utils/orderDraftPatch";
import { loadOrderDraft, saveOrderDraft } from "../../utils/orderStorage";

function formatBRL(value: number) {
  const n = Number.isFinite(value) ? value : 0;
  return `R$ ${n.toFixed(2)}`.replace(".", ",");
}

export default function Review() {
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<OrderDraft | null>(null);

  useEffect(() => {
    loadOrderDraft().then((o) => setOrder(o));
  }, []);

  const subtotal = useMemo(() => Number(order?.subtotal ?? 0), [order]);
  const shippingPrice = useMemo(() => Number(order?.shipping?.price ?? 0), [order]);
  const discount = useMemo(() => Number(order?.discount ?? 0), [order]);
  const total = useMemo(() => subtotal + shippingPrice - discount, [subtotal, shippingPrice, discount]);

  async function handleConfirm() {
    if (!order) return;

    await saveOrderDraft(
      patchOrderDraft(order, {
        discount,
        payment: order.payment ?? { method: "pix", status: "pending" },
      }) as any,
    );

    router.push("/checkout/success" as any);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader title="Revisão" />
      <View style={{ padding: 16, paddingBottom: Math.max(16, insets.bottom + 12) }}>
        <View style={{ padding: 12, borderRadius: 12, backgroundColor: theme.colors.surface }}>
          <Text style={{ color: theme.colors.text, fontWeight: "600" }}>Resumo</Text>
          <Text style={{ marginTop: 8, color: theme.colors.muted }}>Subtotal: {formatBRL(subtotal)}</Text>
          <Text style={{ marginTop: 4, color: theme.colors.muted }}>Frete: {formatBRL(shippingPrice)}</Text>
          <Text style={{ marginTop: 4, color: theme.colors.muted }}>Desconto: {formatBRL(discount)}</Text>
          <Text style={{ marginTop: 8, color: theme.colors.text, fontWeight: "700" }}>Total: {formatBRL(total)}</Text>
        </View>

        <Pressable
          onPress={handleConfirm}
          style={{
            marginTop: 24,
            backgroundColor: theme.colors.primary,
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>Confirmar</Text>
        </Pressable>
      </View>
    </View>
  );
}