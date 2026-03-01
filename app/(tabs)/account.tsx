import { router } from "expo-router";
import { useEffect, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppHeader } from "../../components/AppHeader";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import IconSymbolDefault from "../../components/ui/icon-symbol";
import theme from "../../constants/theme";
import { track } from "../../lib/analytics";

type HubItem = {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  href: string;
};

export default function AccountTab() {
  useEffect(() => {
    try {
      track("account_hub_view");
    } catch {}
  }, []);

  // ✅ Somente rotas confirmadas pela árvore do repo
  const items = useMemo<HubItem[]>(
    () => [
      {
        key: "orders",
        title: "Pedidos",
        subtitle: "Acompanhe status, nota e ações do pedido",
        icon: "receipt-outline",
        href: "/(tabs)/orders",
      },
      {
        key: "notifications",
        title: "Notificações",
        subtitle: "Alertas e atualizações",
        icon: "notifications-outline",
        href: "/orders/notifications",
      },
      {
        key: "address",
        title: "Endereços",
        subtitle: "Gerencie endereço de entrega",
        icon: "location-outline",
        href: "/(tabs)/checkout/address",
      },
      {
        key: "payment",
        title: "Pagamento",
        subtitle: "Métodos e preferências",
        icon: "card-outline",
        href: "/(tabs)/checkout/payment",
      },
      {
        key: "profile",
        title: "Perfil",
        subtitle: "Preferências e dados do usuário",
        icon: "person-circle-outline",
        href: "/(tabs)/profile",
      },
      {
        key: "explore",
        title: "Explorar",
        subtitle: "Descubra categorias e produtos",
        icon: "compass-outline",
        href: "/(tabs)/explore",
      },
      // Opcional (existe na árvore; útil em debug interno)
      {
        key: "debug_outbox",
        title: "Debug (Outbox)",
        subtitle: "Fila local e diagnósticos",
        icon: "bug-outline",
        href: "/debug/outbox",
      },
    ],
    [],
  );

  function go(item: HubItem) {
    try {
      track("account_hub_click", { target: item.key });
    } catch {}

    try {
      router.push(item.href as any);
    } catch {
      // fallback seguro (rota existe; sem crash)
      try {
        router.push("/(tabs)/explore" as any);
      } catch {}
    }
  }

  return (
    <ThemedView style={styles.container}>
      <AppHeader
        title="Conta"
        subtitle="Atalhos e configurações"
        leftSlot={
          <IconSymbolDefault
            name="person-outline"
            size={22}
            color={theme.colors.textPrimary}
          />
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ThemedView style={styles.card}>
          {items.map((item, idx) => (
            <Pressable
              key={item.key}
              onPress={() => go(item)}
              style={({ pressed }) => [
                styles.row,
                pressed ? { opacity: 0.92 } : null,
                idx === items.length - 1 ? styles.rowLast : null,
              ]}
            >
              <View style={styles.iconWrap}>
                <IconSymbolDefault
                  name={item.icon as any}
                  size={20}
                  color={theme.colors.primary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <ThemedText style={styles.title}>{item.title}</ThemedText>
                <ThemedText style={styles.subtitle}>{item.subtitle}</ThemedText>
              </View>

              <IconSymbolDefault
                name="chevron-forward-outline"
                size={18}
                color={theme.colors.muted}
              />
            </Pressable>
          ))}
        </ThemedView>

        <ThemedView style={styles.note}>
          <ThemedText style={styles.noteTitle}>Dica</ThemedText>
          <ThemedText style={styles.noteText}>
            Use “Pedidos” para acompanhar entregas, solicitar devolução e avaliar
            compras.
          </ThemedText>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  content: {
    paddingHorizontal: 14,
    paddingBottom: 18,
    paddingTop: 10,
    gap: 12,
  },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    overflow: "hidden",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
  },
  rowLast: {
    borderBottomWidth: 0,
  },

  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },

  title: { fontSize: 14, fontWeight: "800", color: theme.colors.text },
  subtitle: { marginTop: 2, fontSize: 12, opacity: 0.7 },

  note: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: 12,
    gap: 6,
  },
  noteTitle: { fontSize: 12, fontWeight: "800" },
  noteText: { fontSize: 12, opacity: 0.75 },
});