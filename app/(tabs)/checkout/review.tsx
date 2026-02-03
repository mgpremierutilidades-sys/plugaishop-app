// app/(tabs)/checkout/review.tsx
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../../../components/themed-text";
import { ThemedView } from "../../../components/themed-view";
import theme from "../../../constants/theme";
import type { OrderDraft } from "../../../types/order";
import { formatCurrency } from "../../../utils/formatCurrency";
import { loadOrderDraft } from "../../../utils/orderStorage";

const FONT_TITLE = "Arimo_400Regular";
const FONT_BODY = "OpenSans_400Regular";
const FONT_BODY_BOLD = "OpenSans_700Bold";

function n(v: unknown) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function deriveSelectedIds(draft: OrderDraft): string[] {
  const explicit = draft.selectedItemIds;
  if (Array.isArray(explicit) && explicit.length > 0) return explicit.map(String);

  const items = Array.isArray(draft.items) ? draft.items : [];
  return items.map((it) => String((it as any)?.id ?? "")).filter(Boolean);
}

export default function Review() {
  const [draft, setDraft] = useState<OrderDraft | null>(null);

  useEffect(() => {
    let alive = true;
    loadOrderDraft().then((d) => {
      if (!alive) return;
      setDraft(d);
    });
    return () => {
      alive = false;
    };
  }, []);

  const selectedIds = useMemo(() => {
    if (!draft) return [];
    return deriveSelectedIds(draft);
  }, [draft]);

  if (!draft || !draft.pricing) {
    return (
      <SafeAreaView style={styles.safe}>
        <ThemedView style={styles.container}>
          <ThemedText>Carregando resumo…</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  const { pricing } = draft;

  const itemCount = selectedIds.length;
  const subtotal = n(pricing.subtotalRaw);
  const discount = n(pricing.discountTotal);
  const shipping = n(pricing.shippingEstimated);
  const total = n(pricing.total);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <ThemedView style={styles.container}>
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ThemedText style={styles.backArrow}>←</ThemedText>
          </Pressable>

          <ThemedText style={styles.title}>Revisão</ThemedText>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
          <ThemedView style={styles.card}>
            <ThemedText style={styles.h1}>Resumo</ThemedText>

            <View style={styles.row}>
              <ThemedText style={styles.label}>Itens</ThemedText>
              <ThemedText style={styles.value}>{itemCount}</ThemedText>
            </View>

            <View style={styles.row}>
              <ThemedText style={styles.label}>Subtotal</ThemedText>
              <ThemedText style={styles.value}>{formatCurrency(subtotal)}</ThemedText>
            </View>

            <View style={styles.row}>
              <ThemedText style={styles.label}>Descontos</ThemedText>
              <ThemedText style={styles.value}>- {formatCurrency(discount)}</ThemedText>
            </View>

            <View style={styles.row}>
              <ThemedText style={styles.label}>Frete</ThemedText>
              <ThemedText style={styles.value}>{shipping <= 0 ? "Grátis" : formatCurrency(shipping)}</ThemedText>
            </View>

            <View style={[styles.row, { marginTop: 6 }]}>
              <ThemedText style={styles.totalLabel}>Total</ThemedText>
              <ThemedText style={styles.totalValue}>{formatCurrency(total)}</ThemedText>
            </View>

            <View style={{ height: 12 }} />

            <Pressable onPress={() => router.push("/checkout/success" as any)} style={styles.primaryBtn}>
              <ThemedText style={styles.primaryBtnText}>Confirmar compra</ThemedText>
            </Pressable>
          </ThemedView>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, paddingHorizontal: 16 },
  topbar: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
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
  backArrow: { fontSize: 22, fontWeight: "700" },
  title: { fontFamily: FONT_TITLE, fontSize: 20, fontWeight: "700" },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: 16,
    gap: 10,
  },

  h1: { fontFamily: FONT_TITLE, fontSize: 18, fontWeight: "700" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontFamily: FONT_BODY, fontSize: 12 },
  value: { fontFamily: FONT_BODY_BOLD, fontSize: 12 },

  totalLabel: { fontFamily: FONT_TITLE, fontSize: 16, fontWeight: "700" },
  totalValue: { fontFamily: FONT_TITLE, fontSize: 16, fontWeight: "800" },

  primaryBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: theme.colors.primary,
  },
  primaryBtnText: { fontFamily: FONT_BODY_BOLD, fontSize: 16, color: "#FFF" },
});
