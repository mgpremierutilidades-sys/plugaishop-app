import { useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import type { Order } from "../../types/order";
import { listOrders } from "../../utils/ordersStorage";
import { useOrdersAutoProgress } from "../../hooks/useOrdersAutoProgress";

function formatBRL(value: number) {
  return `R$ ${value.toFixed(2)}`.replace(".", ",");
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);

  useOrdersAutoProgress();

  useEffect(() => {
    listOrders().then(setOrders);
  }, []);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Meus Pedidos</Text>

      {orders.length === 0 ? (
        <Text style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
          Nenhum pedido ainda.
        </Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/orders/${item.id}` as any)}
              style={{
                padding: 14,
                borderRadius: 14,
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: "#E6E8EC",
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "bold" }}>
                Pedido {item.id}
              </Text>
              <Text style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                Total: {formatBRL(item.total)}
              </Text>
              <Text style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                Status: {item.status}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
