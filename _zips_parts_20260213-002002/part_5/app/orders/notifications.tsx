import React, { useCallback, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";

import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import theme, { Radius, Spacing } from "../../constants/theme";
import type { InAppNotification } from "../../utils/ordersStore";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../utils/ordersStore";

function dateLabel(isoOrAny: string) {
  if (!isoOrAny) return "";
  const d = isoOrAny.includes("T") ? isoOrAny.split("T")[0] : isoOrAny;
  if (d.includes("-")) return d.split("-").reverse().join("/");
  return d;
}

export default function OrdersNotificationsScreen() {
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await listNotifications();
    setItems(data ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const markAll = async () => {
    await markAllNotificationsRead();
    await load();
  };

  const open = async (n: InAppNotification) => {
    await markNotificationRead(n.id);
    if (n.orderId) {
      router.push(`/orders/${n.orderId}` as any);
      return;
    }
    await load();
  };

  const unreadCount = items.filter((x) => !x.read).length;

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

          <ThemedText style={styles.title}>Notificações</ThemedText>

          <Pressable onPress={markAll} hitSlop={10} style={styles.rightBtn}>
            <ThemedText style={styles.rightBtnText}>Ler tudo</ThemedText>
          </Pressable>
        </View>

        <ThemedText style={styles.secondary}>
          Não lidas: <ThemedText style={styles.bold}>{unreadCount}</ThemedText>
        </ThemedText>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {items.length === 0 ? (
            <ThemedView style={styles.card}>
              <ThemedText style={styles.cardTitle}>Sem notificações</ThemedText>
              <ThemedText style={styles.secondary}>
                Atualizações do pedido aparecem aqui (ex.: Enviado / Entregue).
              </ThemedText>
            </ThemedView>
          ) : null}

          {items.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => open(n)}
              style={({ pressed }) => [
                styles.card,
                pressed ? { opacity: 0.92 } : null,
              ]}
            >
              <View style={styles.rowBetween}>
                <ThemedText style={styles.cardTitle}>{n.title}</ThemedText>
                {!n.read ? <View style={styles.dot} /> : null}
              </View>

              <ThemedText style={styles.secondary}>{n.body}</ThemedText>

              <View style={styles.divider} />

              <ThemedText style={styles.meta}>
                {dateLabel(n.createdAt)}{" "}
                {n.orderId ? `• Pedido #${n.orderId}` : ""}
              </ThemedText>
            </Pressable>
          ))}

          <View style={{ height: 18 }} />
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
    marginBottom: Spacing.sm,
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

  scroll: { gap: Spacing.md, paddingTop: Spacing.md, paddingBottom: 20 },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardTitle: {
    fontFamily: "Arimo",
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
  },

  secondary: {
    fontFamily: "OpenSans",
    fontSize: 12,
    color: "rgba(0,0,0,0.65)",
  },
  meta: { fontFamily: "OpenSans", fontSize: 12, color: "rgba(0,0,0,0.55)" },
  bold: { fontWeight: "700", color: theme.colors.text },

  divider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    width: "100%",
    marginVertical: 6,
  },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 99,
    backgroundColor: theme.colors.primary,
  },
});
