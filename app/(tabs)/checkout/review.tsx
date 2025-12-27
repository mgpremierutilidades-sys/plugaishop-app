// app/(tabs)/checkout/review.tsx
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../../../components/themed-text";
import { ThemedView } from "../../../components/themed-view";
import theme from "../../../constants/theme";
import { useCart } from "../../../context/CartContext";
import { formatCurrency } from "../../../utils/formatCurrency";
import { addOrder, createOrderFromCart } from "../../../utils/ordersStore";

const FONT_BODY = "OpenSans_400Regular";
const FONT_BOLD = "OpenSans_700Bold";
const FONT_TITLE = "Arimo_400Regular";

// Mock de frete (só para fechar fluxo nesta etapa)
const MOCK_FRETE = 19.9;

type NormalizedItem = {
  productId: string;
  title: string;
  price: number;
  qty: number;
};

function normalizeCartItems(cartAny: any): NormalizedItem[] {
  const raw =
    cartAny?.items ??
    cartAny?.cartItems ??
    cartAny?.cart ??
    cartAny?.products ??
    [];

  if (!Array.isArray(raw)) return [];

  return raw
    .map((it: any) => {
      const product = it?.product ?? it?.item ?? it;

      const productId = product?.id ?? it?.productId ?? it?.id;
      if (productId == null) return null;

      const title =
        product?.title ??
        it?.title ??
        product?.name ??
        it?.name ??
        "Produto";

      const price =
        product?.price ??
        it?.price ??
        product?.unitPrice ??
        it?.unitPrice ??
        0;

      const qty = it?.qty ?? it?.quantity ?? it?.qtd ?? 1;

      return {
        productId: String(productId),
        title: String(title),
        price: Number(price ?? 0),
        qty: Math.max(1, Number(qty ?? 1)),
      };
    })
    .filter(Boolean) as NormalizedItem[];
}

export default function CheckoutReview() {
  const cartAny = useCart() as any;
  const [saving, setSaving] = useState(false);

  const items = useMemo(() => normalizeCartItems(cartAny), [cartAny]);

  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + it.price * it.qty, 0);
  }, [items]);

  const shippingPrice = useMemo(
    () => (items.length ? MOCK_FRETE : 0),
    [items.length]
  );

  const total = useMemo(() => subtotal + shippingPrice, [subtotal, shippingPrice]);

  const clearCart = () => {
    if (typeof cartAny?.clearCart === "function") cartAny.clearCart();
    else if (typeof cartAny?.clear === "function") cartAny.clear();
    else if (typeof cartAny?.reset === "function") cartAny.reset();
  };

  async function confirm() {
    if (saving) return;

    if (!items.length) {
      Alert.alert("Carrinho vazio", "Adicione itens antes de finalizar.");
      return;
    }

    setSaving(true);
    try {
      const order = createOrderFromCart({
        items: items.map((it) => ({
          productId: it.productId,
          title: it.title,
          price: it.price,
          qty: it.qty,
        })),
        discount: 0,
        shipping: { method: "Mock", price: shippingPrice, deadline: 3 },
        status: "Confirmado",
      } as any);

      await addOrder(order);
      clearCart();

      router.replace({
        pathname: "/(tabs)/checkout/success",
        params: { orderId: String(order.id) },
      } as any);
    } catch (e: any) {
      Alert.alert(
        "Erro",
        e?.message ? String(e.message) : "Não foi possível finalizar."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <ThemedText style={styles.backIcon}>←</ThemedText>
          </Pressable>

          <ThemedText style={styles.title}>Revisão</ThemedText>
          <View style={styles.rightSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <ThemedText style={styles.sectionTitle}>Entrega</ThemedText>
            <View style={styles.lineRow}>
              <ThemedText style={styles.muted}>Endereço</ThemedText>
              <ThemedText style={styles.value}>Endereço</ThemedText>
            </View>
            <ThemedText style={styles.muted}>
              Nesta etapa o endereço está como placeholder. Na próxima etapa conectamos ao endereço selecionado do checkout.
            </ThemedText>
          </View>

          <View style={styles.card}>
            <ThemedText style={styles.sectionTitle}>Itens</ThemedText>

            {items.length === 0 ? (
              <ThemedText style={styles.muted}>Seu carrinho está vazio.</ThemedText>
            ) : (
              items.map((it) => (
                <View key={it.productId} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.itemTitle} numberOfLines={2}>
                      {it.title}
                    </ThemedText>
                    <ThemedText style={styles.muted}>Qtd: {it.qty}</ThemedText>
                  </View>

                  <ThemedText style={styles.value}>
                    {formatCurrency(it.price * it.qty)}
                  </ThemedText>
                </View>
              ))
            )}
          </View>

          <View style={styles.card}>
            <ThemedText style={styles.sectionTitle}>Resumo</ThemedText>

            <View style={styles.lineRow}>
              <ThemedText style={styles.muted}>Subtotal</ThemedText>
              <ThemedText style={styles.value}>{formatCurrency(subtotal)}</ThemedText>
            </View>

            <View style={styles.lineRow}>
              <ThemedText style={styles.muted}>Frete</ThemedText>
              <ThemedText style={styles.value}>{formatCurrency(shippingPrice)}</ThemedText>
            </View>

            <View style={styles.totalBox}>
              <ThemedText style={styles.totalLabel}>Total</ThemedText>
              <ThemedText style={styles.totalValue}>{formatCurrency(total)}</ThemedText>
            </View>
          </View>

          <Pressable
            onPress={confirm}
            disabled={saving}
            style={[styles.primaryBtn, saving && { opacity: 0.7 }]}
          >
            <ThemedText style={styles.primaryBtnText}>
              {saving ? "Finalizando..." : "Finalizar compra"}
            </ThemedText>
          </Pressable>

          <Pressable onPress={() => router.replace("/(tabs)/cart" as any)} style={styles.ghostBtn}>
            <ThemedText style={styles.ghostBtnText}>Voltar ao carrinho</ThemedText>
          </Pressable>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 6,
    backgroundColor: theme.colors.background,
  },

  header: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  backBtn: { width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  backIcon: { fontSize: 22, fontFamily: FONT_BOLD, color: theme.colors.text },
  rightSpacer: { width: 40, height: 40 },
  title: { fontSize: 20, fontFamily: FONT_TITLE, textAlign: "center", color: theme.colors.text },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },

  sectionTitle: { fontSize: 14, fontFamily: FONT_BOLD, color: theme.colors.text },
  muted: { fontSize: 12, fontFamily: FONT_BODY, color: theme.colors.textMuted },
  value: { fontSize: 12, fontFamily: FONT_BOLD, color: theme.colors.text },

  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 6,
  },
  itemTitle: { fontSize: 12, fontFamily: FONT_BODY, color: theme.colors.text },

  lineRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },

  totalBox: {
    marginTop: 10,
    backgroundColor: "#F59E0B",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: { fontSize: 12, fontFamily: FONT_BOLD, color: "#000" },
  totalValue: { fontSize: 14, fontFamily: FONT_BOLD, color: "#000" },

  primaryBtn: {
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryBtnText: { color: "#fff", fontSize: 14, fontFamily: FONT_BOLD },

  ghostBtn: {
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostBtnText: { color: theme.colors.text, fontSize: 14, fontFamily: FONT_BOLD },
});
