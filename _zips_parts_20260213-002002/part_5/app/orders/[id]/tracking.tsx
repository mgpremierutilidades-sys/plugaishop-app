import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import { ThemedText } from "../../../components/themed-text";
import { ThemedView } from "../../../components/themed-view";
import theme, { Radius, Spacing } from "../../../constants/theme";
import type {
  LogisticsEvent,
  LogisticsEventType,
  Order,
} from "../../../utils/ordersStore";
import {
  addLogisticsEvent,
  clearLogisticsEvents,
  getOrderById,
  setTrackingCode,
} from "../../../utils/ordersStore";

function safeString(v: unknown) {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}

function dateLabel(iso: string) {
  if (!iso) return "";
  const d = iso.includes("T") ? iso.split("T")[0] : iso;
  if (d.includes("-")) return d.split("-").reverse().join("/");
  return d;
}

function timeLabel(iso: string) {
  if (!iso || !iso.includes("T")) return "";
  const t = iso.split("T")[1]?.slice(0, 5);
  return t ? ` ${t}` : "";
}

function typeLabel(t: LogisticsEventType) {
  if (t === "POSTED") return "Postado";
  if (t === "IN_TRANSIT") return "Em trânsito";
  if (t === "OUT_FOR_DELIVERY") return "Saiu para entrega";
  if (t === "DELIVERED") return "Entregue";
  return "Ocorrência";
}

export default function OrderTrackingScreen() {
  const params = useLocalSearchParams();
  const orderId = safeString(params?.id);

  const [order, setOrder] = useState<Order | null>(null);
  const [code, setCode] = useState("");

  const load = useCallback(async () => {
    if (!orderId) return;
    const found = await getOrderById(orderId);
    setOrder(found);
    setCode(String(found?.trackingCode ?? ""));
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const events: LogisticsEvent[] = useMemo(() => {
    const list = Array.isArray(order?.logisticsEvents)
      ? order!.logisticsEvents!
      : [];
    // já vem ordenado desc por inserção; garante fallback
    return list;
  }, [order]);

  const saveCode = async () => {
    if (!orderId) return;
    const updated = await setTrackingCode(orderId, code);
    if (!updated) {
      Alert.alert("Rastreio", "Não foi possível salvar o código de rastreio.");
      return;
    }
    setOrder(updated);
    Alert.alert("Rastreio", "Código salvo.");
  };

  const addMock = async (type: LogisticsEventType) => {
    if (!orderId) return;

    const titleMap: Record<LogisticsEventType, string> = {
      POSTED: "Objeto postado",
      IN_TRANSIT: "Objeto em trânsito",
      OUT_FOR_DELIVERY: "Saiu para entrega",
      DELIVERED: "Entrega realizada",
      EXCEPTION: "Ocorrência no transporte",
    };

    const updated = await addLogisticsEvent(orderId, {
      type,
      title: titleMap[type],
      location: "Goiânia - GO",
      description: "Evento mock para validação visual no app.",
    });

    if (!updated) {
      Alert.alert("Logística", "Não foi possível adicionar evento.");
      return;
    }
    setOrder(updated);
  };

  const clearAll = async () => {
    if (!orderId) return;
    const updated = await clearLogisticsEvents(orderId);
    if (!updated) return;
    setOrder(updated);
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <ThemedView style={styles.container}>
        <View style={styles.topbar}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.backBtn}
          >
            <ThemedText style={styles.backArrow}>←</ThemedText>
          </Pressable>
          <ThemedText style={styles.title}>Rastreio</ThemedText>
          <Pressable onPress={clearAll} hitSlop={10} style={styles.rightBtn}>
            <ThemedText style={styles.rightBtnText}>Limpar</ThemedText>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <ThemedView style={styles.card}>
            <ThemedText style={styles.cardTitle}>Pedido #{orderId}</ThemedText>

            <ThemedText style={styles.sectionTitle}>
              Código de rastreio
            </ThemedText>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="Ex.: BR1234567890"
              placeholderTextColor="rgba(0,0,0,0.45)"
              style={styles.input}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <Pressable onPress={saveCode} style={styles.primaryBtn}>
              <ThemedText style={styles.primaryBtnText}>
                Salvar código
              </ThemedText>
            </Pressable>

            <View style={styles.divider} />

            <ThemedText style={styles.sectionTitle}>Eventos (mock)</ThemedText>
            <View style={styles.rowWrap}>
              <Pressable onPress={() => addMock("POSTED")} style={styles.pill}>
                <ThemedText style={styles.pillText}>Postado</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => addMock("IN_TRANSIT")}
                style={styles.pill}
              >
                <ThemedText style={styles.pillText}>Trânsito</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => addMock("OUT_FOR_DELIVERY")}
                style={styles.pill}
              >
                <ThemedText style={styles.pillText}>Saiu</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => addMock("DELIVERED")}
                style={styles.pill}
              >
                <ThemedText style={styles.pillText}>Entregue</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => addMock("EXCEPTION")}
                style={styles.pill}
              >
                <ThemedText style={styles.pillText}>Ocorrência</ThemedText>
              </Pressable>
            </View>
          </ThemedView>

          <ThemedView style={styles.card}>
            <ThemedText style={styles.cardTitle}>Linha do tempo</ThemedText>

            {events.length === 0 ? (
              <ThemedText style={styles.secondary}>
                Nenhum evento ainda. Use os botões mock acima para testar.
              </ThemedText>
            ) : (
              <View style={{ gap: 12 }}>
                {events.map((e) => (
                  <View key={e.id} style={styles.eventRow}>
                    <View style={styles.dot} />
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.eventTitle}>
                        {typeLabel(e.type)} — {e.title}
                      </ThemedText>
                      <ThemedText style={styles.secondary}>
                        {dateLabel(e.at)}
                        {timeLabel(e.at)}
                        {e.location ? ` • ${e.location}` : ""}
                      </ThemedText>
                      {e.description ? (
                        <ThemedText style={styles.secondary}>
                          {e.description}
                        </ThemedText>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ThemedView>

          <View style={{ height: 24 }} />
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },

  topbar: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  backArrow: {
    fontFamily: "Arimo",
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.text,
  },
  title: {
    fontFamily: "Arimo",
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
  },
  rightBtn: {
    minWidth: 70,
    height: 44,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  rightBtnText: {
    fontFamily: "OpenSans",
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
  },

  scroll: { gap: Spacing.md, paddingBottom: 20 },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardTitle: {
    fontFamily: "Arimo",
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  sectionTitle: {
    fontFamily: "OpenSans",
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
  },
  secondary: {
    fontFamily: "OpenSans",
    fontSize: 12,
    color: "rgba(0,0,0,0.65)",
  },

  input: {
    height: 46,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    fontFamily: "OpenSans",
    fontSize: 12,
    color: theme.colors.text,
  },
  primaryBtn: {
    paddingVertical: 12,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
  },
  primaryBtnText: {
    fontFamily: "OpenSans",
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  divider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    width: "100%",
    marginVertical: 4,
  },

  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  pillText: {
    fontFamily: "OpenSans",
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
  },

  eventRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 99,
    marginTop: 5,
    backgroundColor: theme.colors.primary,
  },
  eventTitle: {
    fontFamily: "OpenSans",
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
  },
});
