// app/orders/[id].tsx
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Linking,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";

import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import theme, { Radius, Spacing } from "../../constants/theme";
import OrderTimeline, { TimelineStep } from "../../components/OrderTimeline";

import { products } from "../../data/catalog";
import { useCart } from "../../context/CartContext";
import { formatCurrency } from "../../utils/formatCurrency";
import type { Order, OrderStatus } from "../../utils/ordersStore";
import { getOrderById, advanceOrderStatus } from "../../utils/ordersStore";

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
    setOrder(found);
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const historyMap = useMemo(() => {
    const map = new Map<OrderStatus, string>();
    const hist = Array.isArray(order?.statusHistory) ? order!.statusHistory! : [];
    for (const h of hist) {
      if (h?.status && h?.at) map.set(h.status, h.at);
    }
    if (!map.has("Confirmado") && order?.createdAt) map.set("Confirmado", order.createdAt);
    return map;
  }, [order]);

  const timelineSteps: TimelineStep[] = useMemo(() => {
    const status = (order?.status ?? "").toString().toLowerCase();

    const donePago = ["pago", "enviado", "entregue"].includes(status);
    const doneEnviado = ["enviado", "entregue"].includes(status);
    const doneEntregue = status === "entregue";

    const dConfirmado = historyMap.get("Confirmado");
    const dPago = historyMap.get("Pago");
    const dEnviado = historyMap.get("Enviado");
    const dEntregue = historyMap.get("Entregue");

    return [
      {
        title: "Pedido confirmado",
        subtitle: dConfirmado ? `Recebido em ${dateLabel(dConfirmado)}` : "Recebemos seu pedido com sucesso.",
        done: true,
        active: status === "confirmado" || !status,
      },
      {
        title: "Pagamento aprovado",
        subtitle: dPago ? `Aprovado em ${dateLabel(dPago)}` : "Pagamento validado.",
        done: donePago,
        active: status === "pago",
      },
      {
        title: "Pedido enviado",
        subtitle: dEnviado ? `Enviado em ${dateLabel(dEnviado)}` : "Seu pedido saiu para entrega.",
        done: doneEnviado,
        active: status === "enviado",
      },
      {
        title: "Pedido entregue",
        subtitle: dEntregue ? `Entregue em ${dateLabel(dEntregue)}` : "Entrega concluída.",
        done: doneEntregue,
        active: status === "entregue",
      },
    ];
  }, [order, historyMap]);

  const totals = useMemo(() => {
    const items = order?.items ?? [];
    const subtotal = items.reduce((acc, it) => acc + Number(it.price ?? 0) * Number(it.qty ?? 0), 0);
    const discount = Number(order?.discount ?? 0);
    const shipping = Number(order?.shipping ?? 0);
    const total = Math.max(0, subtotal - discount + shipping);
    const count = items.reduce((a, b) => a + Number(b.qty ?? 0), 0);
    return { subtotal, discount, shipping, total, count };
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
    const items = order?.items ?? [];
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
      const prod = (products as any[])?.find((p) => String(p.id) === String(it.productId));
      if (!prod) continue;
      const qty = Math.max(1, Number(it.qty ?? 1));
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
    Alert.alert("Status atualizado", `Novo status: ${updated.status}`);
  };

  const onShare = async () => {
    if (!orderId) return;
    try {
      await Share.share({
        message: `Pedido Plugaí Shop #${orderId} — status: ${order?.status ?? "Confirmado"}`,
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
                  Status: <ThemedText style={styles.bold}>{String(order.status ?? "Confirmado")}</ThemedText>
                </ThemedText>

                {order.trackingCode ? (
                  <ThemedText style={styles.secondary}>
                    Rastreio: <ThemedText style={styles.bold}>{order.trackingCode}</ThemedText>
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
