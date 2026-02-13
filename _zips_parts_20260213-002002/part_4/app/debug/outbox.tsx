import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { getOutbox } from "../../utils/outboxStorage";
import { processOutboxOnce } from "../../utils/outboxProcessor";

export default function OutboxDebug() {
  const [json, setJson] = useState("Carregando...");

  async function refresh() {
    const out = await getOutbox();
    setJson(JSON.stringify(out, null, 2));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function flush() {
    await processOutboxOnce();
    await refresh();
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "bold" }}>Outbox Debug</Text>

      <Pressable
        onPress={flush}
        style={{
          marginTop: 12,
          padding: 12,
          borderRadius: 12,
          backgroundColor: "#EEF1F5",
          borderWidth: 1,
          borderColor: "#E6E8EC",
        }}
      >
        <Text style={{ textAlign: "center", fontWeight: "bold" }}>Forçar envio agora</Text>
      </Pressable>

      <ScrollView style={{ marginTop: 12 }}>
        <Text style={{ fontSize: 11 }}>{json}</Text>
      </ScrollView>
    </View>
  );
}
