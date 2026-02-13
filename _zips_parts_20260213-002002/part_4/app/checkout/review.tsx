// app/checkout/review.tsx
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import theme from "../../constants/theme";
import type { OrderDraft } from "../../types/order";
import { loadOrderDraft, saveOrderDraft } from "../../utils/orderStorage";
import { AppHeader } from "../../components/AppHeader";

export default function Review() {
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<OrderDraft | null>(null);

  useEffect(() => {
    loadOrderDraft().then(setOrder);
  }, []);

  const discount = useMemo(() => Number(order?.discount ?? 0), [order]);

  async function handleConfirm() {
    if (!order) return;

    await saveOrderDraft({
      ...order,
      discount,
      payment: order.payment ?? ({ method: "pix", status: "pending" } as any),
    } as any);

    router.push("/checkout/success" as any);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader title="Revisão" showBack />

      <View
        style={{
          flex: 1,
          padding: 16,
          paddingTop: 12,
          paddingBottom: 16 + insets.bottom,
        }}
      >
        {!order ? (
          <Text style={{ fontSize: 18, color: theme.colors.text }}>
            Carregando revisão...
          </Text>
        ) : (
          <>
            <Text style={{ marginTop: 12, color: theme.colors.text }}>
              Itens: {order.items.length}
            </Text>

            <Text style={{ marginTop: 6, color: theme.colors.text }}>
              Subtotal: R$ {order.subtotal.toFixed(2)}
            </Text>

            <Text style={{ marginTop: 6, color: theme.colors.text }}>
              Desconto: R$ {(order.discount ?? 0).toFixed(2)}
            </Text>

            <Text
              style={{
                marginTop: 6,
                fontWeight: "bold",
                color: theme.colors.text,
              }}
            >
              Total: R$ {order.total.toFixed(2)}
            </Text>

            <Pressable
              onPress={handleConfirm}
              style={{
                marginTop: 24,
                backgroundColor: theme.colors.success,
                padding: 14,
                borderRadius: 12,
              }}
            >
              <Text
                style={{
                  color: "#000",
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                Confirmar pedido
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}
