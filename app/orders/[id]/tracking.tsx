// app/orders/[id]/tracking.tsx
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "../../../components/themed-text";
import { ThemedView } from "../../../components/themed-view";
import theme from "../../../constants/theme";
import { track } from "../../../lib/analytics";
import type { LogisticsEvent, Order } from "../../../types/order";
import { getOrderById } from "../../../utils/ordersStorage";

type Params = { id?: string };

function parseEventISO(e: LogisticsEvent): string {
  // compat: types/order.ts tem at (preferido) e date (legacy)
  const raw = (e.at ?? e.date ?? "").trim();
  if (!raw) return "";
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) ? d.toISOString() : "";
}

function sortEventsDesc(events: LogisticsEvent[]): LogisticsEvent[] {
  // evita recalcular parse várias vezes
  const scored = events.map((e) => {
    const iso = parseEventISO(e);
    const t = iso ? new Date(iso).getTime() : 0;
    return { e, t: Number.isFinite(t) ? t : 0, iso };
  });

  scored.sort((a, b) => b.t - a.t);
  return scored.map((x) => x.e);
}

export default function OrderTrackingScreen() {
  const params = useLocalSearchParams<Params>();
  const orderId = useMemo(() => String(params?.id ?? "").trim(), [params?.id]);

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);

  // evita setState após unmount e também evita "race" em refresh rápido
  const reqSeq = useRef(0);

  const load = useCallback(
    async (reason: "view" | "refresh") => {
      const seq = ++reqSeq.current;

      setLoading(true);
      try {
        const o = orderId ? await getOrderById(orderId) : null;
        if (seq !== reqSeq.current) return; // request antigo, ignora

        setOrder(o);

        try {
          track(
            reason === "view" ? "orders_tracking_view" : "orders_tracking_refresh",
            { order_id: orderId, found: !!o },
          );
        } catch {}
      } finally {
        if (seq === reqSeq.current) setLoading(false);
      }
    },
    [orderId],
  );

  useEffect(() => {
    void load("view");
  }, [load]);

  const logisticsEvents = order?.logisticsEvents;

  const events = useMemo(() => {
    const list = Array.isArray(logisticsEvents) ? logisticsEvents : [];
    return sortEventsDesc(list);
  }, [logisticsEvents]);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <ThemedText style={styles.title}>Rastreamento</ThemedText>
        <ThemedText style={styles.subtitle}>
          {orderId ? `Pedido #${orderId}` : "Pedido inválido"}
        </ThemedText>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <ThemedText style={styles.muted}>Carregando...</ThemedText>
        </View>
      ) : !order ? (
        <View style={styles.center}>
          <ThemedText style={styles.titleSmall}>Pedido não encontrado</ThemedText>
          <ThemedText style={styles.muted}>
            Não foi possível localizar os dados deste pedido no armazenamento local.
          </ThemedText>
        </View>
      ) : (
        <>
          <View style={styles.summaryCard}>
            <ThemedText style={styles.summaryTitle}>Status</ThemedText>
            <ThemedText style={styles.summaryValue}>{String(order.status ?? "")}</ThemedText>

            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryMeta}>Criado em</ThemedText>
              <ThemedText style={styles.summaryMetaValue}>
                {order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}
              </ThemedText>
            </View>

            {order.trackingCode ? (
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryMeta}>Código</ThemedText>
                <ThemedText style={styles.summaryMetaValue}>{order.trackingCode}</ThemedText>
              </View>
            ) : null}
          </View>

          <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            <ThemedText style={styles.sectionTitle}>Eventos</ThemedText>

            {events.length === 0 ? (
              <View style={styles.emptyCard}>
                <ThemedText style={styles.muted}>Nenhum evento de logística registrado.</ThemedText>
              </View>
            ) : (
              events.map((e) => {
                const iso = parseEventISO(e);
                const dt = iso ? new Date(iso).toLocaleString() : "-";
                const title =
                  e.title?.trim() ||
                  e.note?.trim() ||
                  String(e.type ?? "Atualização").toUpperCase();

                return (
                  <View key={e.id} style={styles.eventCard}>
                    <View style={styles.eventTopRow}>
                      <ThemedText style={styles.eventTitle} numberOfLines={2}>
                        {title}
                      </ThemedText>
                      <ThemedText style={styles.eventTime}>{dt}</ThemedText>
                    </View>

                    {e.location ? <ThemedText style={styles.eventMeta}>{e.location}</ThemedText> : null}
                    {e.description ? <ThemedText style={styles.eventDesc}>{e.description}</ThemedText> : null}
                  </View>
                );
              })
            )}

            <View style={{ height: 16 }} />
          </ScrollView>

          <Pressable onPress={() => void load("refresh")} style={styles.refreshBtn}>
            <ThemedText style={styles.refreshText}>Atualizar</ThemedText>
          </Pressable>
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  title: { fontSize: 20, fontWeight: "900", color: theme.colors.text },
  subtitle: { marginTop: 4, fontSize: 12, color: theme.colors.textMuted },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  muted: { fontSize: 12, color: theme.colors.textMuted },

  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: 14,
    gap: 8,
  },
  summaryTitle: { fontSize: 12, color: theme.colors.textMuted, fontWeight: "800" },
  summaryValue: { fontSize: 14, color: theme.colors.text, fontWeight: "900" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  summaryMeta: { fontSize: 12, color: theme.colors.textMuted },
  summaryMetaValue: { fontSize: 12, color: theme.colors.text },

  listContent: { paddingHorizontal: 16, paddingBottom: 90 },
  sectionTitle: { fontSize: 13, fontWeight: "900", color: theme.colors.text, marginBottom: 10 },

  emptyCard: {
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: 14,
  },

  eventCard: {
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  eventTopRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  eventTitle: { flex: 1, fontSize: 13, fontWeight: "900", color: theme.colors.text },
  eventTime: { fontSize: 11, color: theme.colors.textMuted },
  eventMeta: { fontSize: 12, color: theme.colors.textMuted },
  eventDesc: { fontSize: 12, color: theme.colors.text },

  refreshBtn: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 14,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshText: { color: "#fff", fontSize: 13, fontWeight: "900" },

  titleSmall: { fontSize: 14, fontWeight: "900", color: theme.colors.text },
});