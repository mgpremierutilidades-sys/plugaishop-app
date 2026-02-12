import { router } from "expo-router";
import { useCallback } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import theme, { Radius, Spacing } from "../../constants/theme";
import { useCart } from "../../context/CartContext";
import { addOrder, createOrderFromCart } from "../../utils/ordersStore";

function normalizeCartItems(cartAny: any) {
  const raw =
    cartAny?.items ??
    cartAny?.cartItems ??
    cartAny?.cart ??
    cartAny?.products ??
    [];

  if (!Array.isArray(raw)) return [];

  return raw
    .map((it) => {
      const product = it?.product ?? it?.item ?? it;
      const productId = product?.id ?? it?.productId ?? it?.id;
      const title = product?.title ?? it?.title ?? "Produto";
      const price = product?.price ?? it?.price ?? 0;
      const qty = it?.qty ?? it?.quantity ?? 1;

      if (productId == null) return null;

      return {
        productId: String(productId),
        title: String(title),
        price: Number(price ?? 0),
        qty: Math.max(1, Number(qty ?? 1)),
      };
    })
    .filter(Boolean) as { productId: string; qty: number; price: number; title: string }[];
}

export default function CheckoutSuccessScreen() {
  const cartAny = useCart() as any;

  const clearCart = useCallback(() => {
    if (typeof cartAny?.clearCart === "function") cartAny.clearCart();
    else if (typeof cartAny?.clear === "function") cartAny.clear();
    else if (typeof cartAny?.reset === "function") cartAny.reset();
  }, [cartAny]);

  const generateOrder = useCallback(async () => {
    const items = normalizeCartItems(cartAny);

    if (!items.length) {
      return null;
    }

    const order = createOrderFromCart({
      items,
      discount: 0,
      shipping: 0,
      status: "Confirmado",
    });

    await addOrder(order);
    return order;
  }, [cartAny]);

  const goOrders = () => router.push("/orders" as any);
  const goHome = () => router.push("/(tabs)" as any);

  const goToLatestOrder = async () => {
    const order = await generateOrder();
    clearCart();

    if (order?.id) {
      router.push(`/orders/${order.id}` as any);
      return;
    }

    Alert.alert("Pedido", "Seu pedido foi confirmado.");
    goOrders();
  };

  const justGoOrders = async () => {
    await generateOrder();
    clearCart();
    goOrders();
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <ThemedView style={styles.container}>
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <ThemedText style={styles.backArrow}>â†</ThemedText>
          </Pressable>

          <ThemedText style={styles.title}>Compra concluÃ­da</ThemedText>

          <View style={{ width: 44 }} />
        </View>

        <ThemedView style={styles.card}>
          <ThemedText style={styles.h1}>Pedido confirmado</ThemedText>
          <ThemedText style={styles.p}>
            Seu pedido foi registrado com sucesso. VocÃª pode acompanhar em â€œPedidosâ€.
          </ThemedText>

          <View style={{ height: 6 }} />

          <Pressable onPress={goToLatestOrder} style={styles.primaryBtn}>
            <ThemedText style={styles.primaryBtnText}>Ver pedido agora</ThemedText>
          </Pressable>

          <Pressable onPress={justGoOrders} style={styles.secondaryBtn}>
            <ThemedText style={styles.secondaryBtnText}>Ir para Pedidos</ThemedText>
          </Pressable>

          <Pressable
            onPress={() => {
              clearCart();
              goHome();
            }}
            style={styles.ghostBtn}
          >
            <ThemedText style={styles.ghostBtnText}>Voltar ao inÃ­cio</ThemedText>
          </Pressable>
        </ThemedView>
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

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  h1: { fontFamily: "Arimo", fontSize: 20, fontWeight: "700", color: theme.colors.text },
  p: { fontFamily: "OpenSans", fontSize: 12, color: "rgba(0,0,0,0.65)", lineHeight: 16 },

  primaryBtn: {
    paddingVertical: 12,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
  },
  primaryBtnText: { fontFamily: "OpenSans", fontSize: 16, fontWeight: "700", color: "#FFFFFF" },

  secondaryBtn: {
    paddingVertical: 12,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  secondaryBtnText: { fontFamily: "OpenSans", fontSize: 16, fontWeight: "700", color: theme.colors.primary },

  ghostBtn: {
    paddingVertical: 12,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  ghostBtnText: { fontFamily: "OpenSans", fontSize: 16, fontWeight: "700", color: theme.colors.text },
});

