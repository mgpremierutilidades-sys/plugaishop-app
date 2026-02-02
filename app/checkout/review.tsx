// app/checkout/review.tsx
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import theme from "../../constants/theme";
import { useCart } from "../../context/CartContext";
import type { OrderDraft, Payment } from "../../types/order";
import { formatCurrency } from "../../utils/formatCurrency";
import { loadOrderDraft, saveOrderDraft } from "../../utils/orderStorage";

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

function toDraftItems(cartItems: any[]) {
  return (cartItems ?? []).map((it) => {
    const p = it?.product;
    return {
      id: String(it?.id ?? p?.id ?? p?.productId ?? `item_${Math.random().toString(16).slice(2)}`),
      title: String(p?.title ?? "Produto"),
      price: n(p?.price ?? 0),
      qty: Math.max(1, Math.floor(n(it?.qty ?? 1))),
      discountPercent: n(p?.discountPercent ?? 0) || undefined,
    };
  });
}

function nowISO() {
  return new Date().toISOString();
}

export default function Review() {
  const cartAny = useCart() as any;
  const goBack = () => router.back();

  const cartItems = useMemo(() => {
    const items = cartAny?.items ?? [];
    return Array.isArray(items) ? items : [];
  }, [cartAny?.items]);

  const computed = useMemo(() => calcFromCart(cartItems), [cartItems]);

  const [storedDraft, setStoredDraft] = useState<OrderDraft | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const d = await loadOrderDraft();
        if (!alive) return;
        setStoredDraft(d);
      } catch {
        if (!alive) return;
        setStoredDraft(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const draft: OrderDraft = useMemo(() => {
    const baseItems = toDraftItems(cartItems);

    const base: OrderDraft = {
      v: 2,
      createdAt: nowISO(),
      items: baseItems,
      selectedItemIds: baseItems.map((it) => it.id),

      subtotal: n(computed.subtotal),
      discount: n(computed.discount),
      total: n(computed.total),
    };

    if (!storedDraft) return base;

    const hasItems = Array.isArray(storedDraft.items) && storedDraft.items.length > 0;
    const items = hasItems ? storedDraft.items : base.items;

    const subtotal: number = storedDraft.subtotal == null ? n(base.subtotal) : n(storedDraft.subtotal);
    const discount: number = storedDraft.discount == null ? n(base.discount) : n(storedDraft.discount);
    const shippingPrice: number = n(storedDraft.shipping?.price ?? 0);

    const total: number =
      storedDraft.total == null ? Math.max(0, subtotal - discount + shippingPrice) : Math.max(0, n(storedDraft.total));

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

  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (saving) return;

    setSaving(true);
    try {
      const fallbackPayment: Payment = { method: "pix", status: "pending" };

      const toSave: OrderDraft = {
        ...draft,
        payment: draft.payment ?? fallbackPayment,
      };

      await saveOrderDraft(toSave);
      router.push("/checkout/success");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={goBack} style={styles.backBtn}>
            <ThemedText style={styles.backIcon}>←</ThemedText>
          </Pressable>

          <ThemedText style={styles.title}>Revisão</ThemedText>

          <View style={styles.rightSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <ThemedText style={styles.sectionTitle}>Resumo</ThemedText>

            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryKey}>Subtotal</ThemedText>
              <ThemedText style={styles.summaryVal}>{formatCurrency(subtotal)}</ThemedText>
            </View>

            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryKey}>Descontos</ThemedText>
              <ThemedText style={styles.summaryVal}>-{formatCurrency(discount)}</ThemedText>
            </View>

            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryKey}>Frete</ThemedText>
              <ThemedText style={styles.summaryVal}>{formatCurrency(shipping)}</ThemedText>
            </View>

            <View style={styles.hr} />

            <View style={styles.summaryRow}>
              <ThemedText style={styles.totalKey}>Total</ThemedText>
              <ThemedText style={styles.totalVal}>{formatCurrency(total)}</ThemedText>
            </View>
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.primaryBtn, saving && { opacity: 0.7 }]}
            onPress={handleConfirm}
            disabled={saving}
          >
            <ThemedText style={styles.primaryBtnText}>
              {saving ? "Confirmando..." : "Confirmar pedido"}
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 14 },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  content: { paddingVertical: 14 },

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
