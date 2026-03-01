import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../components/AppHeader";
import { isFlagEnabled } from "../../constants/flags";
import theme from "../../constants/theme";
import { track } from "../../lib/analytics";
import type { InAppNotification } from "../../types/order";
import {
  clearNotifications,
  listNotifications,
  markAllRead,
  markRead,
} from "../../utils/notificationsStorage";

type NotificationData = {
  type?: string;
  [k: string]: any;
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const enabled = isFlagEnabled("ff_orders_notifications_v1");
  const devTools = isFlagEnabled("ff_dev_tools_v1");
  const ctaEnabled = isFlagEnabled("ff_orders_notifications_cta_v1");

  const [items, setItems] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const unread = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const load = useCallback(async () => {
    setLoading(true);
    const n = await listNotifications();
    setItems(n);
    setLoading(false);

    try {
      track("orders_notifications_view", { count: n.length });
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const markLocalRead = useCallback((id: string) => {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, read: true } : x)));
  }, []);

  const handleOpen = useCallback(
    async (n: InAppNotification) => {
      // otimista (UI instantânea)
      if (!n.read) markLocalRead(n.id);

      // persistência (storage já emite bus → badge atualiza)
      try {
        if (!n.read) await markRead(n.id);
      } catch {}

      const t = (n.data as NotificationData | undefined)?.type ?? "unknown";

      try {
        track("notification_open", {
          id: n.id,
          type: t,
          order_id: n.orderId ?? null,
          unread_before: unread,
        });
        if (!n.read) {
          track("notification_mark_read", { id: n.id, type: t });
        }
      } catch {}

      // CTA: navegação
      if (!ctaEnabled) return;

      if (n.orderId) {
        router.push(`/orders/${n.orderId}` as any);
        return;
      }
    },
    [ctaEnabled, markLocalRead, unread],
  );

  if (!enabled) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          paddingTop: insets.top,
        }}
      >
        <AppHeader title="Notificações" showBack />
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: "900", color: theme.colors.text }}>
            Em breve
          </Text>
          <Text style={{ marginTop: 8, opacity: 0.7, color: theme.colors.text }}>
            Notificações estão desativadas no momento.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingTop: insets.top,
      }}
    >
      <AppHeader title={`Notificações${unread ? ` (${unread})` : ""}`} showBack />

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 16 + insets.bottom,
          gap: 10,
        }}
      >
        {loading ? (
          <Text style={{ opacity: 0.7, color: theme.colors.text }}>Carregando...</Text>
        ) : null}

        {!loading && items.length === 0 ? (
          <View
            style={{
              padding: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.colors.divider,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "900", color: theme.colors.text }}>
              Sem notificações
            </Text>
            <Text style={{ marginTop: 6, opacity: 0.7, color: theme.colors.text }}>
              Quando o status do pedido mudar, aparecerá aqui.
            </Text>
          </View>
        ) : null}

        {!loading
          ? items.map((n) => (
              <Pressable
                key={n.id}
                onPress={() => handleOpen(n)}
                style={({ pressed }) => [
                  {
                    padding: 14,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: n.read ? theme.colors.divider : theme.colors.primary,
                    backgroundColor: theme.colors.surface,
                    opacity: pressed ? 0.95 : 1,
                  },
                ]}
              >
                <Text style={{ fontSize: 13, fontWeight: "900", color: theme.colors.text }}>
                  {n.title}
                </Text>
                <Text style={{ marginTop: 6, fontSize: 12, opacity: 0.8, color: theme.colors.text }}>
                  {n.body}
                </Text>
                <Text style={{ marginTop: 6, fontSize: 12, opacity: 0.6, color: theme.colors.text }}>
                  {String(n.createdAt).slice(0, 19).replace("T", " ")}
                </Text>
              </Pressable>
            ))
          : null}

        {!loading && items.length > 0 ? (
          <View style={{ gap: 10, marginTop: 6 }}>
            <Pressable
              onPress={async () => {
                await markAllRead();
                // otimista local também (sem reload)
                setItems((prev) => prev.map((x) => ({ ...x, read: true })));
              }}
              style={{
                borderWidth: 1,
                borderColor: theme.colors.divider,
                padding: 12,
                borderRadius: 12,
                backgroundColor: theme.colors.surface,
              }}
            >
              <Text style={{ textAlign: "center", fontWeight: "800", color: theme.colors.text }}>
                Marcar tudo como lido
              </Text>
            </Pressable>

            {devTools ? (
              <Pressable
                onPress={async () => {
                  try {
                    track("dev_tools_used", { action: "clear_notifications" });
                  } catch {}
                  await clearNotifications();
                  setItems([]);
                }}
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.divider,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: theme.colors.surface,
                }}
              >
                <Text style={{ textAlign: "center", fontWeight: "800", color: theme.colors.text }}>
                  (DEV) Limpar notificações
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}