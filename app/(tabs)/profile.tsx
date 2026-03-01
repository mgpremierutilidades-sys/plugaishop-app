import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";

import { AppHeader } from "../../components/AppHeader";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import IconSymbolDefault from "../../components/ui/icon-symbol";
import theme from "../../constants/theme";
import { track } from "../../lib/analytics";
import {
  DEFAULT_PREFS,
  loadProfilePrefs,
  saveProfilePrefs,
  type ProfilePrefs,
} from "../../utils/profilePrefs";

type LinkItem = {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  href: string;
};

export default function ProfileTab() {
  const [prefs, setPrefs] = useState<ProfilePrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const next = await loadProfilePrefs();
        setPrefs(next);
      } finally {
        setLoading(false);
      }
    })();

    try {
      track("profile_prefs_view");
    } catch {}
  }, []);

  function setPref<K extends keyof ProfilePrefs>(key: K, value: ProfilePrefs[K]) {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      void saveProfilePrefs(next);

      try {
        track("profile_prefs_toggle", { key, value: !!value });
      } catch {}

      return next;
    });
  }

  const links = useMemo<LinkItem[]>(
    () => [
      {
        key: "account",
        title: "Conta",
        subtitle: "Atalhos e configurações",
        icon: "person-outline",
        href: "/(tabs)/account",
      },
      {
        key: "orders",
        title: "Pedidos",
        subtitle: "Status, devolução e avaliação",
        icon: "receipt-outline",
        href: "/(tabs)/orders",
      },
      {
        key: "notifications",
        title: "Notificações",
        subtitle: "Avisos e atualizações",
        icon: "notifications-outline",
        href: "/orders/notifications",
      },
    ],
    [],
  );

  return (
    <ThemedView style={styles.container}>
      <AppHeader
        title="Perfil"
        subtitle="Preferências e atalhos"
        leftSlot={
          <IconSymbolDefault
            name="person-circle-outline"
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
          <ThemedText style={styles.sectionTitle}>Preferências</ThemedText>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.rowTitle}>Notificações</ThemedText>
              <ThemedText style={styles.rowSub}>
                Alertas de pedidos e atualizações
              </ThemedText>
            </View>
            <Switch
              value={!!prefs.notificationsEnabled}
              onValueChange={(v) => setPref("notificationsEnabled", v)}
              disabled={loading}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.rowTitle}>Modo compacto</ThemedText>
              <ThemedText style={styles.rowSub}>
                Menos espaçamento e cards mais densos
              </ThemedText>
            </View>
            <Switch
              value={!!prefs.compactMode}
              onValueChange={(v) => setPref("compactMode", v)}
              disabled={loading}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.rowTitle}>Ofertas e novidades</ThemedText>
              <ThemedText style={styles.rowSub}>
                Receber promoções (local, sem backend)
              </ThemedText>
            </View>
            <Switch
              value={!!prefs.marketingOptIn}
              onValueChange={(v) => setPref("marketingOptIn", v)}
              disabled={loading}
            />
          </View>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText style={styles.sectionTitle}>Atalhos</ThemedText>

          {links.map((item, idx) => (
            <Pressable
              key={item.key}
              onPress={() => {
                try {
                  track("profile_link_click", { target: item.key });
                } catch {}
                router.push(item.href as any);
              }}
              style={({ pressed }) => [
                styles.linkRow,
                pressed ? { opacity: 0.92 } : null,
                idx === links.length - 1 ? styles.linkRowLast : null,
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
                <ThemedText style={styles.rowTitle}>{item.title}</ThemedText>
                <ThemedText style={styles.rowSub}>{item.subtitle}</ThemedText>
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
          <ThemedText style={styles.noteTitle}>Nota</ThemedText>
          <ThemedText style={styles.noteText}>
            As preferências são salvas localmente. Integração com backend pode ser
            adicionada depois sem quebrar a UI.
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
    paddingTop: 10,
    paddingBottom: 18,
    gap: 12,
  },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: 12,
    gap: 10,
  },

  sectionTitle: { fontSize: 12, fontWeight: "800", opacity: 0.9 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  rowTitle: { fontSize: 14, fontWeight: "800", color: theme.colors.text },
  rowSub: { marginTop: 2, fontSize: 12, opacity: 0.7 },

  divider: { height: 1, backgroundColor: theme.colors.divider },

  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
  },
  linkRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },

  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },

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