// app/(tabs)/checkout/review.tsx
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import theme from "../../../constants/theme";
import type { OrderDraft } from "../../../types/order";
import { loadOrderDraft, saveOrderDraft } from "../../../utils/orderStorage";

export default function Review() {
  const [order, setOrder] = useState<OrderDraft | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const d = await loadOrderDraft();
      if (!alive) return;
      setOrder(d);
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function handleConfirm() {
    if (!order) return;

    await saveOrderDraft({
      ...order,
      payment: { method: "pix", status: "pending" },
    });

    router.push("/checkout/success");
  }

  if (!order) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 18 }}>Carregando revisão...</Text>
      </View>
    );
  }

  const discount = order.discount ?? 0;

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Revisão do Pedido</Text>

      <Text style={{ marginTop: 12 }}>Itens: {order.items.length}</Text>

      <Text style={{ marginTop: 6 }}>Subtotal: R$ {order.subtotal.toFixed(2)}</Text>

      <Text style={{ marginTop: 6 }}>Desconto: R$ {discount.toFixed(2)}</Text>

      <Text style={{ marginTop: 6, fontWeight: "bold" }}>
        Total: R$ {order.total.toFixed(2)}
      </Text>

      <Pressable
        onPress={handleConfirm}
        style={{
          marginTop: 24,
          backgroundColor: theme.colors.success,
          padding: 14,
          borderRadius: 8,
        }}
      >
        <Text style={{ color: "#000", fontWeight: "bold", textAlign: "center" }}>
          Confirmar pedido
        </Text>
      </Pressable>
    </View>
  );
}
