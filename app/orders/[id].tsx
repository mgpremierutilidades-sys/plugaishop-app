// app/orders/[id].tsx
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import OrderTimeline, { TimelineStep } from "../../components/OrderTimeline";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import theme, { Radius, Spacing } from "../../constants/theme";

import { useCart } from "../../context/CartContext";
import { products } from "../../data/catalog";
import type { Order } from "../../types/order";
import type { OrderStatus } from "../../types/orderStatus";
import { formatCurrency } from "../../utils/formatCurrency";
import { advanceOrderStatus, getOrderById, normalizeStatusLabel } from "../../utils/ordersStore";

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

function statusToStepDateMap(order?: Order | null) {
  const map = new Map<OrderStatus, string>();

  // Prefer: timeline (novo padrão)
  const timeline = Array.isArray((order as any)?.timeline) ? ((order as any).timeline as any[]) : [];
  for (const e of timeline) {
    const s = e?.status as OrderStatus | undefined;
    const d = (e?.date ?? e?.at) as string | undefined; // tolera mock antigo
    if (s && d) map.set(s, d);
  }

  // Fallback: createdAt
  if (order?.createdAt && !map.has("created" as OrderStatus)) {
    map.set("created" as OrderStatus, order.createdAt);
  }

  return map;
}

export default function OrderDetailScreen() {
  const params = useLocalSearchParams();
  const orderId = safeString(params?.id);

  const cartAny = useCart() as any;
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

  const historyMap = useMemo(() => statusToStepDateMap(order), [order]);

  const timelineSteps: TimelineStep[] = useMemo(() => {
    const status = (order?.status ?? ("created" as any)) as OrderStatus;

    const donePaid = ["paid", "processing", "shipped", "delivered"].includes(String(status));
    const doneShipped = ["shipped", "delivered"].includes(String(status));
    const doneDelivered = String(status) === "delivered";

    const dCreated = historyMap.get("created" as OrderStatus);
    const dPaid = historyMap.get("paid" as OrderStatus);
    const dShipped = historyMap.get("shipped" as OrderStatus);
    const dDelivered = historyMap.get("delivered" as OrderStatus);

    return [
      {
        title: "Pedido confirmado",
        subtitle: dCreated ? `Recebido em ${dateLabel(dCreated)}` : "Recebemos seu pedido com sucesso.",
        done: true,
        active: String(status) === "created" || !status,
      },
      {
        title: "Pagamento aprovado",
        subtitle: dPaid ? `Aprovado em ${dateLabel(dPaid)}` : "Pagamento validado.",
        done: donePaid,
        active: String(status) === "paid" || String(status) === "payment_pending",
      },
      {
        title: "Pedido enviado",
        subtitle: dShipped ? `Enviado em ${dateLabel(dShipped)}` : "Seu pedido saiu para entrega.",
        done: doneShipped,
        active: String(status) === "shipped" || String(status) === "processing",
      },
      {
        title: "Pedido entregue",
        subtitle: dDelivered ? `Entregue em ${dateLabel(dDelivered)}` : "Entrega concluída.",
        done: doneDelivered,
        active: String(status) === "delivered",
      },
    ];
  }, [order, historyMap]);

  const totals = useMemo(() => {
    const items: any[] = Array.isArray((order as any)?.items) ? ((order as any).items as any[]) : [];

    const subtotal = items.reduce(
      (acc: number, it: any) => acc + Number(it?.price ?? 0) * Number(it?.qty ?? 0),
      0
    );

    const discount = Number((order as any)?.discount ?? 0);

    const shippingValue =
      typeof (order as any)?.shipping === "number"
        ? Number((order as any).shipping ?? 0)
        : Number((order as any)?.shipping?.price ?? 0);

    const total = Math.max(0, subtotal - discount + shippingValue);

    const count = items.reduce((a: number, b: any) => a + Number(b?.qty ?? 0), 0);

    return { subtotal, discount, shipping: shippingValue, total, count };
  }, [order]);

  const onCopyId = async () => {
    if (!orderId) return;
    const ok = await copyToClipboard(orderId);
    if (ok) Alert.alert("Copiado", "ID do pedido copiado para a área de transferência.");
    else Alert.alert("Copiar ID", `Copie manualmente: ${orderId}`);
  };

  const onTrackExternal = async () => {
    const url = `https://example.com/rastreio?pedido=${encodeURIComponent(orderId || "0")}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Indisponível", "Não foi possível abrir o link de rastreio neste dispositivo.");
      return;
    }
    Linking.openURL(url);
  };

  const onRepeatPurchase = () => {
    const items: any[] = Array.isArray((order as any)?.items) ? ((order as any).items as any[]) : [];
    if (!items.length) {
      Alert.alert("Atenção", "Este pedido não possui itens para repetir.");
      return;
    }

    const addOne = (product: any, qty: number) => {
      if (typeof cartAny?.addItem === "function") return cartAny.addItem(product, qty);
      if (typeof cartAny?.addToCart === "function") return cartAny.addToCart(product, qty);
      if (typeof cartAny?.add === "function") return cartAny.add(product, qty);
      return null;
    };

    let added = 0;
    for (const it of items) {
      const prod = (products as any[])?.find((p) => String(p.id) === String(it?.productId));
      if (!prod) continue;
      const qty = Math.max(1, Number(it?.qty ?? 1));
      addOne(prod, qty);
      added += qty;
    }

    if (!added) {
      Alert.alert("Não foi possível repetir", "Não encontramos os produtos deste pedido no catálogo atual.");
      return;
    }

    Alert.alert("Repetir compra", "Itens adicionados ao carrinho.", [
      { text: "Continuar", style: "default" },
      { text: "Ir para o carrinho", style: "default", onPress: () => router.push("/(tabs)/cart" as any) },
    ]);
  };

  const onAdvanceStatus = async () => {
    if (!orderId) return;
    const updated = await advanceOrderStatus(orderId);
    if (!updated) {
      Alert.alert("Status", "Não foi possível atualizar o status deste pedido.");
      return;
    }
    setOrder(updated);
    Alert.alert("Status atualizado", `Novo status: ${normalizeStatusLabel(updated.status)}`);
  };

  const onShare = async () => {
    if (!orderId) return;
    try {
      await Share.share({
        message: `Pedido Plugaí Shop #${orderId} — status: ${normalizeStatusLabel((order?.status ?? "created") as any)}`,
      });
    } catch {
      Alert.alert("Compartilhar", "Não foi possível compartilhar no momento.");
    }
  };

  const goSupport = () => router.push(`/orders/${orderId}/support` as any);
  const goInvoice = () => router.push(`/orders/${orderId}/invoice` as any);
  const goReview = () => router.push(`/orders/${orderId}/review` as any);
  const goReturn = () => router.push(`/orders/${orderId}/return` as any);
  const goNotifications = () => router.push(`/orders/notifications` as any);
  const goTracking = () => router.push(`/orders/${orderId}/tracking` as any);

  if (!order) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
        <ThemedView style={styles.container}>
          <View style={styles.topbar}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
              <ThemedText style={styles.backArrow}>←</ThemedText>
            </Pressable>
            <ThemedText style={styles.title}>Pedido detalhe</ThemedText>
            <View style={{ width: 44 }} />
          </View>

          <ThemedView style={styles.card}>
            <ThemedText style={styles.cardTitle}>Pedido não encontrado</ThemedText>
            <ThemedText style={styles.secondary}>
              Não localizamos o pedido informado. Volte e selecione um pedido válido.
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <ThemedView style={styles.container}>
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <ThemedText style={styles.backArrow}>←</ThemedText>
          </Pressable>
          <ThemedText style={styles.title}>Pedido detalhe</ThemedText>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ThemedView style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.cardTitle}>Pedido #{orderId}</ThemedText>
                <ThemedText style={styles.secondary}>
                  Status:{" "}
                  <ThemedText style={styles.bold}>
                    {normalizeStatusLabel((order.status ?? "created") as any)}
                  </ThemedText>
                </ThemedText>

                {(order as any).trackingCode ? (
                  <ThemedText style={styles.secondary}>
                    Rastreio: <ThemedText style={styles.bold}>{(order as any).trackingCode}</ThemedText>
                  </ThemedText>
                ) : null}
              </View>

              <Pressable onPress={onCopyId} style={styles.smallBtn}>
                <ThemedText style={styles.smallBtnText}>Copiar ID</ThemedText>
              </Pressable>
            </View>

            <View style={styles.divider} />

            <View style={styles.actionRow}>
              <Pressable onPress={onTrackExternal} style={styles.actionBtn}>
                <ThemedText style={styles.actionBtnText}>Rastrear</ThemedText>
              </Pressable>

              <Pressable onPress={goTracking} style={styles.actionBtnOutline}>
                <ThemedText style={styles.actionBtnOutlineText}>Rastreio (Histórico)</ThemedText>
              </Pressable>
            </View>

            <View style={styles.actionRow}>
              <Pressable onPress={onRepeatPurchase} style={styles.actionBtnOutline}>
                <ThemedText style={styles.actionBtnOutlineText}>Repetir</ThemedText>
              </Pressable>

              <Pressable onPress={onAdvanceStatus} style={styles.actionBtnOutline}>
                <ThemedText style={styles.actionBtnOutlineText}>Avançar status</ThemedText>
              </Pressable>
            </View>

            <View style={styles.actionRow}>
              <Pressable onPress={onShare} style={styles.actionBtnOutline}>
                <ThemedText style={styles.actionBtnOutlineText}>Compartilhar</ThemedText>
              </Pressable>

              <Pressable onPress={goInvoice} style={styles.actionBtnOutline}>
                <ThemedText style={styles.actionBtnOutlineText}>Nota Fiscal</ThemedText>
              </Pressable>
            </View>

            <View style={styles.actionRow}>
              <Pressable onPress={goSupport} style={styles.actionBtnOutline}>
                <ThemedText style={styles.actionBtnOutlineText}>Suporte</ThemedText>
              </Pressable>

              <Pressable onPress={goReturn} style={styles.actionBtnOutline}>
                <ThemedText style={styles.actionBtnOutlineText}>Troca/Reembolso</ThemedText>
              </Pressable>
            </View>

            <View style={styles.actionRow}>
              <Pressable onPress={goReview} style={styles.actionBtnOutline}>
                <ThemedText style={styles.actionBtnOutlineText}>Avaliar</ThemedText>
              </Pressable>

              <Pressable onPress={goNotifications} style={styles.actionBtnOutline}>
                <ThemedText style={styles.actionBtnOutlineText}>Notificações</ThemedText>
              </Pressable>
            </View>
          </ThemedView>

          <ThemedView style={styles.card}>
            <ThemedText style={styles.cardTitle}>Resumo</ThemedText>

            <View style={styles.kv}>
              <ThemedText style={styles.k}>Itens</ThemedText>
              <ThemedText style={styles.v}>{totals.count}</ThemedText>
            </View>

            <View style={styles.kv}>
              <ThemedText style={styles.k}>Subtotal</ThemedText>
              <ThemedText style={styles.v}>{formatCurrency(totals.subtotal)}</ThemedText>
            </View>

            <View style={styles.kv}>
              <ThemedText style={styles.k}>Descontos</ThemedText>
              <ThemedText style={styles.v}>- {formatCurrency(totals.discount)}</ThemedText>
            </View>

            <View style={styles.kv}>
              <ThemedText style={styles.k}>Frete</ThemedText>
              <ThemedText style={styles.v}>{formatCurrency(totals.shipping)}</ThemedText>
            </View>

            <View style={styles.divider} />

            <View style={styles.kv}>
              <ThemedText style={[styles.k, styles.bold]}>Total</ThemedText>
              <ThemedText style={[styles.v, styles.bold]}>{formatCurrency(totals.total)}</ThemedText>
            </View>
          </ThemedView>

          <OrderTimeline steps={timelineSteps} />

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

  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.md },
  divider: { height: 1, backgroundColor: theme.colors.divider, width: "100%", marginVertical: 6 },

  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  smallBtnText: { fontFamily: "OpenSans", fontSize: 12, fontWeight: "700", color: theme.colors.text },

  actionRow: { flexDirection: "row", gap: Spacing.md },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
  },
  actionBtnText: { fontFamily: "OpenSans", fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
  actionBtnOutline: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  actionBtnOutlineText: { fontFamily: "OpenSans", fontSize: 12, fontWeight: "700", color: theme.colors.primary },

  kv: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  k: { fontFamily: "OpenSans", fontSize: 12, color: "rgba(0,0,0,0.65)" },
  v: { fontFamily: "OpenSans", fontSize: 12, color: theme.colors.text },
  bold: { fontWeight: "700", color: theme.colors.text },

  secondary: { fontFamily: "OpenSans", fontSize: 12, color: "rgba(0,0,0,0.65)" },
});
