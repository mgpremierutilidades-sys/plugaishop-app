// app/(tabs)/checkout/review.tsx
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../../../components/themed-text";
import { ThemedView } from "../../../components/themed-view";
import theme from "../../../constants/theme";
import { useCart } from "../../../context/CartContext";
import type { OrderDraft } from "../../../types/order";
import { formatCurrency } from "../../../utils/formatCurrency";
import { loadOrderDraft, saveOrderDraft } from "../../../utils/orderStorage";

const FONT_TITLE = "Arimo_400Regular";
const FONT_BODY = "OpenSans_400Regular";
const FONT_BODY_BOLD = "OpenSans_700Bold";

function n(value: unknown) {
  const v = Number(value);
  return Number.isFinite(v) ? v : 0;
}

function calcFromCart(cartItems: any[]) {
  const subtotal = cartItems.reduce((acc, it) => {
    const price = n(it?.price ?? it?.product?.price);
    const qty = Math.max(1, Math.floor(n(it?.qty ?? 1)));
    return acc + price * qty;
  }, 0);

  const discount = cartItems.reduce((acc, it) => {
    const price = n(it?.price ?? it?.product?.price);
    const qty = Math.max(1, Math.floor(n(it?.qty ?? 1)));
    const pct = n(it?.discountPercent ?? it?.product?.discountPercent ?? 0);
    if (pct <= 0) return acc;
    return acc + price * (pct / 100) * qty;
  }, 0);

  const total = Math.max(0, subtotal - discount);

  return { subtotal, discount, total };
}

export default function Review() {
  const cartAny = useCart() as any;
  const goBack = () => router.back();

  const cartItems = useMemo(() => {
    const items = cartAny?.items ?? [];
    return Array.isArray(items) ? items : [];
  }, [cartAny?.items]);

  // Base imediata (não trava): sempre consegue renderizar usando carrinho
  const computed = useMemo(() => calcFromCart(cartItems), [cartItems]);

  // Draft vindo do storage (opcional)
  const [storedDraft, setStoredDraft] = useState<OrderDraft | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const d = await loadOrderDraft();
        if (!alive) return;
        setStoredDraft(d);
      } catch {
        // Não deixa travar por erro de storage
        if (!alive) return;
        setStoredDraft(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Draft efetivo: storage (se existir) + fallback do carrinho
  const draft: OrderDraft = useMemo(() => {
    const base: OrderDraft = {
      items: cartItems,
      subtotal: computed.subtotal,
      discount: computed.discount,
      total: computed.total,
    };

    if (!storedDraft) return base;

    const hasItems = Array.isArray(storedDraft.items) && storedDraft.items.length > 0;
    const items = hasItems ? storedDraft.items : base.items;

    const subtotal = storedDraft.subtotal == null ? base.subtotal : n(storedDraft.subtotal);
    const discount = storedDraft.discount == null ? base.discount : n(storedDraft.discount);
    const shippingPrice = n(storedDraft.shipping?.price ?? 0);

    const total =
      storedDraft.total == null
        ? Math.max(0, subtotal - (discount ?? 0) + shippingPrice)
        : Math.max(0, n(storedDraft.total));

    return {
      ...base,
      ...storedDraft,
      items,
      subtotal,
      discount,
      total,
    };
  }, [storedDraft, cartItems, computed.subtotal, computed.discount, computed.total]);

  const subtotal = useMemo(() => n(draft.subtotal ?? 0), [draft.subtotal]);
  const discount = useMemo(() => n(draft.discount ?? 0), [draft.discount]);
  const shipping = useMemo(() => n(draft.shipping?.price ?? 0), [draft.shipping?.price]);
  const total = useMemo(() => {
    const t = draft.total == null ? subtotal - discount + shipping : n(draft.total);
    return Math.max(0, t);
  }, [draft.total, subtotal, discount, shipping]);

  const itemCount = useMemo(() => (draft.items?.length ?? 0), [draft.items]);

  async function handleConfirm() {
    // Salva um draft consistente para o success/Orders
    await saveOrderDraft({
      ...draft,
      items: draft.items ?? cartItems,
      subtotal,
      discount,
      total,
      payment: draft.payment ?? { method: "pix", status: "pending" },
    });

    router.push("/(tabs)/checkout/success" as any);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={goBack} hitSlop={12} style={styles.backBtn} accessibilityRole="button">
            <ThemedText style={styles.backIcon}>←</ThemedText>
          </Pressable>

          <ThemedText style={styles.title}>Revisão</ThemedText>
          <View style={styles.rightSpacer} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={styles.card}>
            <ThemedText style={styles.sectionTitle}>Itens</ThemedText>

            <ThemedText style={styles.mutedText}>
              {itemCount} {itemCount === 1 ? "item" : "itens"}
            </ThemedText>

            <View style={{ height: 10 }} />

            {(draft.items ?? []).slice(0, 6).map((it: any) => {
              const p = it?.product ?? it;
              const title = String(p?.title ?? it?.title ?? "Produto");
              const qty = Math.max(1, Math.floor(n(it?.qty ?? 1)));
              const price = n(p?.price ?? it?.price ?? 0);

              return (
                <View key={String(p?.id ?? it?.id ?? title)} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <ThemedText numberOfLines={2} style={styles.itemTitle}>
                      {title}
                    </ThemedText>
                    <ThemedText style={styles.mutedText}>
                      {qty}x · {formatCurrency(price)}
                    </ThemedText>
                  </View>

                  <ThemedText style={styles.itemRight}>{formatCurrency(price * qty)}</ThemedText>
                </View>
              );
            })}

            {(draft.items?.length ?? 0) > 6 ? (
              <ThemedText style={[styles.mutedText, { marginTop: 8 }]}>
                + {(draft.items?.length ?? 0) - 6} itens
              </ThemedText>
            ) : null}
          </View>

          <View style={styles.card}>
            <ThemedText style={styles.sectionTitle}>Resumo</ThemedText>

            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryKey}>Subtotal</ThemedText>
              <ThemedText style={styles.summaryVal}>{formatCurrency(subtotal)}</ThemedText>
            </View>

            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryKey}>Descontos</ThemedText>
              <ThemedText style={styles.summaryVal}>- {formatCurrency(discount)}</ThemedText>
            </View>

            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryKey}>Frete</ThemedText>
              <ThemedText style={styles.summaryVal}>{shipping === 0 ? "Grátis" : formatCurrency(shipping)}</ThemedText>
            </View>

            <View style={styles.hr} />

            <View style={styles.summaryRow}>
              <ThemedText style={styles.totalKey}>Total</ThemedText>
              <ThemedText style={styles.totalVal}>{formatCurrency(total)}</ThemedText>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable onPress={handleConfirm} style={styles.primaryBtn} accessibilityRole="button">
            <ThemedText style={styles.primaryBtnText}>CONFIRMAR PEDIDO</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, paddingHorizontal: 14, paddingTop: 6, backgroundColor: theme.colors.background },

  header: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  backBtn: { width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  backIcon: { fontSize: 22, fontFamily: FONT_BODY_BOLD },
  rightSpacer: { width: 40, height: 40 },
  title: { fontSize: 20, fontFamily: FONT_TITLE, textAlign: "center", fontWeight: "700" },

  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },

  sectionTitle: { fontSize: 14, fontFamily: FONT_BODY_BOLD, marginBottom: 6 },
  mutedText: { fontSize: 12, fontFamily: FONT_BODY, opacity: 0.75 },

  itemRow: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  itemTitle: { fontSize: 12, fontFamily: FONT_BODY_BOLD, opacity: 0.95 },
  itemRight: { fontSize: 12, fontFamily: FONT_BODY_BOLD, opacity: 0.9 },

  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  summaryKey: { fontSize: 12, fontFamily: FONT_BODY, opacity: 0.85 },
  summaryVal: { fontSize: 12, fontFamily: FONT_BODY_BOLD, opacity: 0.9 },

  hr: { height: 1, backgroundColor: theme.colors.divider, marginVertical: 8 },

  totalKey: { fontSize: 12, fontFamily: FONT_BODY_BOLD, opacity: 0.9 },
  totalVal: { fontSize: 14, fontFamily: FONT_BODY_BOLD, opacity: 0.95 },

  footer: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 10,
  },

  primaryBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: FONT_BODY_BOLD,
    textTransform: "uppercase",
  },
});

