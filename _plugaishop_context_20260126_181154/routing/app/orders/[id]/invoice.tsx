// app/orders/[id]/invoice.tsx
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../../../components/themed-text";
import { ThemedView } from "../../../components/themed-view";
import theme, { Radius, Spacing } from "../../../constants/theme";
import type { Order } from "../../../utils/ordersStore";
import { clearInvoice, getOrderById, setInvoiceMock } from "../../../utils/ordersStore";

function safeString(v: unknown) {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}

function dateLabel(isoOrAny: string) {
  if (!isoOrAny) return "";
  const d = isoOrAny.includes("T") ? isoOrAny.split("T")[0] : isoOrAny;
  if (d.includes("-")) return d.split("-").reverse().join("/");
  return d;
}

async function copyToClipboard(text: string) {
  try {
    const mod = await import("expo-clipboard");
    if (mod?.setStringAsync) {
      await mod.setStringAsync(text);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export default function OrderInvoiceScreen() {
  const params = useLocalSearchParams();
  const orderId = safeString(params?.id);

  const [order, setOrder] = useState<Order | null>(null);

  const load = useCallback(async () => {
    if (!orderId) {
      setOrder(null);
      return;
    }
    const found = await getOrderById(orderId);
    setOrder(found ?? null);
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const invoice = order?.invoice;
  const isIssued = invoice?.status === "EMITIDA";

  const subtitle = useMemo(() => {
    if (!invoice) return "Aguardando emissão.";
    if (invoice.status === "AGUARDANDO") return "Aguardando emissão.";
    const d = invoice.issuedAt ? dateLabel(invoice.issuedAt) : "";
    return d ? `Emitida em ${d}` : "Nota emitida.";
  }, [invoice]);

  const onEmitMock = async () => {
    if (!orderId) return;
    const updated = await setInvoiceMock(orderId);
    if (!updated) {
      Alert.alert("Nota Fiscal", "Não foi possível gerar a nota (mock).");
      return;
    }
    setOrder(updated);
  };

  const onClear = async () => {
    if (!orderId) return;
    const updated = await clearInvoice(orderId);
    if (!updated) return;
    setOrder(updated);
  };

  const onOpenDanfe = async () => {
    const url = invoice?.danfeUrl;
    if (!url) {
      Alert.alert("DANFE", "DANFE indisponível no momento.");
      return;
    }
    const ok = await Linking.canOpenURL(url);
    if (!ok) {
      Alert.alert("DANFE", "Não foi possível abrir a DANFE neste dispositivo.");
      return;
    }
    Linking.openURL(url);
  };

  const onCopyAccessKey = async () => {
    const key = invoice?.accessKey;
    if (!key) {
      Alert.alert("Chave de acesso", "Chave indisponível no momento.");
      return;
    }
    const ok = await copyToClipboard(key);
    if (ok) Alert.alert("Copiado", "Chave de acesso copiada.");
    else Alert.alert("Copiar", `Copie manualmente: ${key}`);
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <ThemedView style={styles.container}>
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <ThemedText style={styles.backArrow}>←</ThemedText>
          </Pressable>
          <ThemedText style={styles.title}>Nota Fiscal</ThemedText>
          <Pressable onPress={onClear} hitSlop={10} style={styles.rightBtn}>
            <ThemedText style={styles.rightBtnText}>Limpar</ThemedText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ThemedView style={styles.card}>
            <ThemedText style={styles.cardTitle}>Pedido #{orderId}</ThemedText>
            <ThemedText style={styles.secondary}>{subtitle}</ThemedText>

            <View style={styles.divider} />

            <View style={styles.kv}>
              <ThemedText style={styles.k}>Status</ThemedText>
              <ThemedText style={styles.v}>{invoice?.status === "EMITIDA" ? "Emitida" : "Aguardando"}</ThemedText>
            </View>

            <View style={styles.kv}>
              <ThemedText style={styles.k}>Número</ThemedText>
              <ThemedText style={styles.v}>{invoice?.number ?? "-"}</ThemedText>
            </View>

            <View style={styles.kv}>
              <ThemedText style={styles.k}>Série</ThemedText>
              <ThemedText style={styles.v}>{invoice?.series ?? "-"}</ThemedText>
            </View>

            <View style={styles.kv}>
              <ThemedText style={styles.k}>Chave</ThemedText>
              <ThemedText style={styles.v}>{invoice?.accessKey ? "Disponível" : "-"}</ThemedText>
            </View>

            <View style={{ height: 10 }} />

            {!isIssued ? (
              <Pressable onPress={onEmitMock} style={styles.primaryBtn}>
                <ThemedText style={styles.primaryBtnText}>Gerar NF (mock)</ThemedText>
              </Pressable>
            ) : (
              <View style={styles.actionRow}>
                <Pressable onPress={onOpenDanfe} style={styles.primaryBtn}>
                  <ThemedText style={styles.primaryBtnText}>Abrir DANFE</ThemedText>
                </Pressable>

                <Pressable onPress={onCopyAccessKey} style={styles.outlineBtn}>
                  <ThemedText style={styles.outlineBtnText}>Copiar chave</ThemedText>
                </Pressable>
              </View>
            )}

            <ThemedText style={styles.note}>
              Integração real: a DANFE será fornecida pelo seu backend consultando a Bling. O app não armazena token da Bling.
            </ThemedText>
          </ThemedView>

          <View style={{ height: 24 }} />
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
  rightBtnText: { fontFamily: "OpenSans", fontSize: 12, fontWeight: "700", color: theme.colors.text },

  scroll: { gap: Spacing.md, paddingBottom: 20 },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardTitle: { fontFamily: "Arimo", fontSize: 18, fontWeight: "700", color: theme.colors.text },
  secondary: { fontFamily: "OpenSans", fontSize: 12, color: "rgba(0,0,0,0.65)" },

  divider: { height: 1, backgroundColor: theme.colors.divider, width: "100%", marginVertical: 6 },

  kv: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  k: { fontFamily: "OpenSans", fontSize: 12, color: "rgba(0,0,0,0.65)" },
  v: { fontFamily: "OpenSans", fontSize: 12, fontWeight: "700", color: theme.colors.text },

  actionRow: { flexDirection: "row", gap: 10 },

  primaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
  },
  primaryBtnText: { fontFamily: "OpenSans", fontSize: 16, fontWeight: "700", color: "#FFFFFF" },

  outlineBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  outlineBtnText: { fontFamily: "OpenSans", fontSize: 12, fontWeight: "700", color: theme.colors.primary },

  note: { fontFamily: "OpenSans", fontSize: 12, color: "rgba(0,0,0,0.65)", marginTop: 6 },
});
