import React, { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";

import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import theme, { Radius, Spacing } from "../../constants/theme";
import { formatCurrency } from "../../utils/formatCurrency";
import type { Order, OrderStatus } from "../../utils/ordersStore";
import { listOrders, getUnreadNotificationsCount } from "../../utils/ordersStore";

function dateLabel(isoOrAny: string) {
  if (!isoOrAny) return "";
  const d = isoOrAny.includes("T") ? isoOrAny.split("T")[0] : isoOrAny;
  if (d.includes("-")) return d.split("-").reverse().join("/");
  return d;
}

const FILTERS: { label: string; value: "ALL" | OrderStatus }[] = [
  { label: "Todos", value: "ALL" },
  { label: "Confirmado", value: "Confirmado" },
  { label: "Pago", value: "Pago" },
  { label: "Enviado", value: "Enviado" },
  { label: "Entregue", value: "Entregue" },
];

export default function OrdersIndexScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | OrderStatus>("ALL");
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    const data = await listOrders();
    setOrders(data ?? []);

    const c = await getUnreadNotificationsCount();
    setUnread(c);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return (orders ?? [])
      .filter((o) => (filter === "ALL" ? true : o.status === filter))
      .filter((o) => {
        if (!q) return true;
        return String(o.id).toLowerCase().includes(q);
      });
  }, [orders, query, filter]);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <ThemedView style={styles.container}>
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <ThemedText style={styles.backArrow}>â†</ThemedText>
          </Pressable>

          <ThemedText style={styles.title}>Pedidos</ThemedText>

          <Pressable
            onPress={() => router.push("/orders/notifications" as any)}
            hitSlop={10}
            style={styles.notifBtn}
          >
            <ThemedText style={styles.notifBtnText}>Notifs</ThemedText>
            {unread > 0 ? (
              <View style={styles.badge}>
                <ThemedText style={styles.badgeText}>
                  {unread > 99 ? "99+" : String(unread)}
                </ThemedText>
              </View>
            ) : null}
          </Pressable>
        </View>

        {/* Busca */}
        <View style={styles.searchWrap}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por ID do pedido"
            placeholderTextColor={"rgba(0,0,0,0.45)"}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Filtros */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <Pressable
                key={String(f.value)}
                onPress={() => setFilter(f.value)}
                style={[styles.pill, active ? styles.pillActive : styles.pillIdle]}
              >
                <ThemedText
                  style={[
                    styles.pillText,
                    active ? styles.pillTextActive : styles.pillTextIdle,
                  ]}
                >
                  {f.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {filtered.length === 0 ? (
            <ThemedView style={styles.card}>
              <ThemedText style={styles.cardTitle}>Nada por aqui</ThemedText>
              <ThemedText style={styles.secondary}>
                Tente outro filtro ou busque pelo ID do pedido.
              </ThemedText>
            </ThemedView>
          ) : null}

          {filtered.map((o) => {
            const subtotal = (o.items ?? []).reduce(
              (acc, it) => acc + Number(it.price ?? 0) * Number(it.qty ?? 0),
              0
            );
            const total = Math.max(
              0,
              subtotal - Number(o.discount ?? 0) + Number(o.shipping ?? 0)
            );
            const itemCount = (o.items ?? []).reduce((a, b) => a + Number(b.qty ?? 0), 0);

            return (
              <Pressable
                key={String(o.id)}
                onPress={() => router.push(`/orders/${o.id}` as any)}
                style={({ pressed }) => [styles.card, pressed ? { opacity: 0.92 } : null]}
              >
                <View style={styles.rowBetween}>
                  <ThemedText style={styles.cardTitle}>Pedido #{String(o.id)}</ThemedText>
                  <ThemedText style={styles.status}>{String(o.status ?? "Confirmado")}</ThemedText>
                </View>

                <ThemedText style={styles.secondary}>Data: {dateLabel(String(o.createdAt ?? ""))}</ThemedText>

                <View style={styles.divider} />

                <View style={styles.rowBetween}>
                  <ThemedText style={styles.secondary}>
                    Itens: <ThemedText style={styles.bold}>{itemCount}</ThemedText>
                  </ThemedText>

                  <ThemedText style={styles.total}>{formatCurrency(total)}</ThemedText>
                </View>
              </Pressable>
            );
          })}

          <View style={{ height: 18 }} />
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },

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
  backArrow: { fontFamily: "Arimo", fontSize: 22, fontWeight: "700", color: theme.colors.text },
  title: { fontFamily: "Arimo", fontSize: 20, fontWeight: "700", color: theme.colors.text },

  notifBtn: {
    width: 70,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  notifBtnText: { fontFamily: "OpenSans", fontSize: 12, fontWeight: "700", color: theme.colors.text },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 22,
    height: 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 6,
  },
  badgeText: { fontFamily: "OpenSans", fontSize: 10, fontWeight: "700", color: "#FFFFFF" },

  searchWrap: { marginBottom: Spacing.md },
  searchInput: {
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

  filters: { gap: 10, paddingBottom: Spacing.md },
  pill: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  pillIdle: { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider },
  pillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pillText: { fontFamily: "OpenSans", fontSize: 12, fontWeight: "700" },
  pillTextIdle: { color: theme.colors.text },
  pillTextActive: { color: "#FFFFFF" },

  scroll: { gap: Spacing.md, paddingBottom: 20 },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardTitle: { fontFamily: "Arimo", fontSize: 18, fontWeight: "700", color: theme.colors.text },

  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.md },
  divider: { height: 1, backgroundColor: theme.colors.divider, width: "100%", marginVertical: 8 },

  status: { fontFamily: "OpenSans", fontSize: 12, fontWeight: "700", color: theme.colors.primary },
  secondary: { fontFamily: "OpenSans", fontSize: 12, color: "rgba(0,0,0,0.65)" },
  bold: { fontWeight: "700", color: theme.colors.text },
  total: { fontFamily: "OpenSans", fontSize: 12, fontWeight: "700", color: theme.colors.text },
});

