import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import type { Order } from "../../types/order";
import { listOrders } from "../../utils/ordersStorage";
import { exportOrder } from "../../utils/orderExport";

export default function ExportDebug() {
  const [json, setJson] = useState<string>("Carregando...");

  useEffect(() => {
    (async () => {
      const orders = await listOrders();
      const last = orders[0] as Order | undefined;

      if (!last) {
        setJson("Nenhum pedido encontrado em Meus Pedidos.");
        return;
      }

      const out = exportOrder(last);
      setJson(JSON.stringify(out, null, 2));
    })();
  }, []);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>Export Debug</Text>
      <Text style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
        Último pedido salvo (canonical + bling + nuvemshop)
      </Text>

      <ScrollView style={{ marginTop: 12 }}>
        <Text style={{ fontSize: 11 }}>{json}</Text>
      </ScrollView>
    </View>
  );
}
