// app/(tabs)/orders.tsx
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import theme from "../../constants/theme";

// Ponte de compat (mantém padrão do projeto)
import { listOrders } from "../../utils/ordersStorage";
import type { Order } from "../../utils/ordersStore";

export default function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    listOrders()
      .then((list) => {
        if (!alive) return;
        setOrders(Array.isArray(list) ? list : []);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Pedidos</ThemedText>

      {loading ? (
        <ThemedText style={styles.muted}>Carregando...</ThemedText>
      ) : orders.length === 0 ? (
        <ThemedText style={styles.muted}>Você ainda não tem pedidos.</ThemedText>
      ) : (
        <View style={styles.list}>
          {orders.map((o) => (
            <Pressable key={o.id} style={styles.row} onPress={() => router.push(`/orders/${o.id}`)}>
              <View style={styles.rowLeft}>
                <ThemedText style={styles.rowTitle}>Pedido {o.id.slice(0, 8)}</ThemedText>
                <ThemedText style={styles.rowSub}>{new Date(o.createdAt).toLocaleString("pt-BR")}</ThemedText>
              </View>
              <View style={styles.rowRight}>
                <ThemedText style={styles.badge}>{String(o.status)}</ThemedText>
                <ThemedText style={styles.rowTotal}>
                  R$ {Number(o.total || 0).toFixed(2).replace(".", ",")}
                </ThemedText>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontFamily: "Arimo",
    fontSize: 24,
    marginBottom: 12,
    color: theme.colors.text,
  },
  muted: {
    opacity: 0.7,
  },
  list: {
    gap: 10,
    marginTop: 8,
  },
  row: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLeft: { gap: 2 },
  rowRight: { alignItems: "flex-end", gap: 6 },
  rowTitle: { fontWeight: "700" },
  rowSub: { opacity: 0.7, fontSize: 12 },
  badge: {
    fontSize: 12,
    opacity: 0.8,
  },
  rowTotal: { fontWeight: "700" },
});
