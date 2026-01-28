// app/orders/[id].tsx
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import OrderTimeline, { TimelineStep } from "../../components/OrderTimeline";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import theme, { Radius, Spacing } from "../../constants/theme";

import { asNumber, formatCurrency } from "../../utils/formatCurrency";
import type { Order, OrderStatus } from "../../utils/ordersStore";
import {
  advanceOrderStatus,
  buildOrderSupportText,
  getOrderById,
  getTrackingUrl,
  normalizeStatusLabel,
} from "../../utils/ordersStore";

function safeString(v: unknown) {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}

function formatDate(isoOrAny?: string) {
  const s = String(isoOrAny ?? "").trim();
  if (!s) return "";
  const d = s.includes("T") ? s.split("T")[0] : s;
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

/**
 * Timeline do ordersStore canônico:
 * statusHistory: [{ status: "confirmed" | "paid" | "shipped" | "delivered" | ..., at: ISO }]
 */
function getHistoryDate(order: Order | null, status: OrderStatus) {
  const hist = Array.isArray((order as any)?.statusHistory) ? (((order as any).statusHistory as any[]) ?? []) : [];
  const hit = hist.find((h) => String(h?.status ?? "") === String(status));
  const at = String(hit?.at ?? "");
  return at ? formatDate(at) : "";
}

type NormalizedOrderItem = {
  productId: string;
  title: string;
  qty: number;
  price: number;
  lineTotal: number;
};

function normalizeOrderItems(order: Order | null): NormalizedOrderItem[] {
  const raw = Array.isArray((order as any)?.items) ? (((order as any).items as any[]) ?? []) : [];

  return raw
    .map((it) => {
      const productId =
        it?.productId ?? it?.id ?? it?.product?.id ?? it?.product?.productId ?? it?.product?.sku ?? "";

      const title = it?.title ?? it?.product?.title ?? "Produto";
      const qty = Math.max(1, Math.floor(asNumber(it?.qty ?? it?.quantity ?? 1)));
      const price = asNumber(it?.price ?? it?.unitPrice ?? it?.product?.price ?? 0);

      if (!String(productId)) return null;

      return {
        productId: String(productId),
        title: String(title),
        qty,
        price,
        lineTotal: price * qty,
      } satisfies NormalizedOrderItem;
    })
    .filter(Boolean) as NormalizedOrderItem[];
}

export default function OrderDetailScreen() {
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

  const items = useMemo(() => normalizeOrderItems(order), [order]);

  const totals = useMemo(() => {
    const subtotalFromItems = items.reduce((acc, it) => acc + it.lineTotal, 0);

    const subtotal = Number.isFinite(asNumber((order as any)?.subtotal))
      ? asNumber((order as any)?.subtotal)
      : subtotalFromItems;

    const discount = asNumber((order as any)?.discount ?? 0);
    const shipping = asNumber((order as any)?.shipping ?? (order as any)?.shippingCost ?? 0);

    const totalField = asNumber((order as any)?.total);
    const totalComputed = Math.max(0, subtotal - discount + shipping);
    const total = totalField > 0 ? totalField : totalComputed;

    const count = items.reduce((a, b) => a + b.qty, 0);

    return { subtotal, discount, shipping, total, count };
  }, [order, items]);

  const statusLabel = useMemo(() => {
    const s = String((order as any)?.status ?? "pending") as any;
    return normalizeStatusLabel(s);
  }, [order]);

  const createdAtLabel = useMemo(() => formatDate((order as any)?.createdAt), [order]);

  const trackingCode = useMemo(() => safeString((order as any)?.trackingCode), [order]);
  const trackingUrl = useMemo(() => getTrackingUrl(trackingCode), [trackingCode]);

  const timelineSteps: TimelineStep[] = useMemo(() => {
    const s = String((order as any)?.status ?? "pending").toLowerCase();

    const donePago = ["paid", "processing", "shipped", "delivered"].includes(s);
    const doneEnviado = ["shipped", "delivered"].includes(s);
    const doneEntregue = ["delivered"].includes(s);

    // Datas por statusHistory (canônico)
    const dConfirmado = getHistoryDate(order, "confirmed") || createdAtLabel;
    const dPago = getHistoryDate(order, "paid");
    const dEnviado = getHistoryDate(order, "shipped");
    const dEntregue = getHistoryDate(order, "delivered");

    return [
      {
        title: "Pedido confirmado",
        subtitle: dConfirmado ? `Recebido em ${dConfirmado}` : "Recebemos seu pedido com sucesso.",
        done: true,
        active: ["pending", "confirmed"].includes(s),
      },
      {
        title: "Pagamento aprovado",
        subtitle: dPago ? `Aprovado em ${dPago}` : "Pagamento validado.",
        done: donePago,
        active: ["paid", "processing"].includes(s),
      },
      {
        title: "Pedido enviado",
        subtitle: dEnviado ? `Enviado em ${dEnviado}` : "Seu pedido saiu para entrega.",
        done: doneEnviado,
        active: s === "shipped",
      },
      {
        title: "Pedido entregue",
        subtitle: dEntregue ? `Entregue em ${dEntregue}` : "Entrega concluída.",
        done: doneEntregue,
        active: s === "delivered",
      },
    ];
  }, [order, createdAtLabel]);

  const onCopyId = async () => {
    if (!orderId) return;
    const ok = await copyToClipboard(orderId);
    if (ok) Alert.alert("Copiado", "ID do pedido copiado para a área de transferência.");
    else Alert.alert("Copiar ID", `Copie manualmente: ${orderId}`);
  };

  const onSupport = async () => {
    if (!order) return;
    const text = buildOrderSupportText(order);
    const ok = await copyToClipboard(text);
    Alert.alert(
      "Suporte",
      ok ? "Mensagem do pedido copiada. Cole no WhatsApp/atendimento para agilizar." : "Não foi possível copiar automaticamente.",
      ok
        ? [{ text: "OK" }]
        : [
            { text: "OK" },
            { text: "Ver mensagem", onPress: () => Alert.alert("Mensagem do pedido", text) },
          ]
    );
  };

  const onTrack = async () => {
    if (!trackingUrl) return;
    const supported = await Linking.canOpenURL(trackingUrl);
    if (!supported) {
      Alert.alert("Indisponível", "Não foi possível abrir o link de rastreio neste dispositivo.");
      return;
    }
    Linking.openURL(trackingUrl);
  };

  const onAdvanceStatus = async () => {
    if (!orderId) return;
    const updated = await advanceOrderStatus(orderId);
    if (!updated) {
      Alert.alert("Status", "Não foi possível atualizar o status deste pedido.");
      return;
    }
    setOrder(updated);
    Alert.alert("Status atualizado", `Novo status: ${normalizeStatusLabel((updated as any).status)}`);
  };

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

          <Pressable onPress={onCopyId} hitSlop={10} style={styles.iconBtn} accessibilityRole="button">
            <ThemedText style={styles.iconBtnText}>ID</ThemedText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ThemedView style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.cardTitle}>Pedido #{orderId}</ThemedText>
                {createdAtLabel ? <ThemedText style={styles.secondary}>Data: {createdAtLabel}</ThemedText> : null}

                <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <ThemedText style={styles.secondary}>Status:</ThemedText>
                  <View style={styles.statusChip}>
                    <ThemedText style={styles.statusChipText}>{statusLabel}</ThemedText>
                  </View>
                </View>

                {trackingCode ? (
                  <ThemedText style={[styles.secondary, { marginTop: 8 }]}>
                    Rastreio: <ThemedText style={styles.boldText}>{trackingCode}</ThemedText>
                  </ThemedText>
                ) : null}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.actionRow}>
              <Pressable onPress={onSupport} style={styles.actionBtnOutline} accessibilityRole="button">
                <ThemedText style={styles.actionBtnOutlineText}>FALAR NO SUPORTE</ThemedText>
              </Pressable>

              <Pressable
                onPress={onTrack}
                disabled={!trackingUrl}
                style={[styles.actionBtn, !trackingUrl ? styles.actionBtnDisabled : null]}
                accessibilityRole="button"
              >
                <ThemedText style={styles.actionBtnText}>{trackingUrl ? "RASTREAR PEDIDO" : "SEM RASTREIO"}</ThemedText>
              </Pressable>
            </View>

            {__DEV__ ? (
              <Pressable onPress={onAdvanceStatus} style={styles.devBtn} accessibilityRole="button">
                <ThemedText style={styles.devBtnText}>Avançar status (teste)</ThemedText>
              </Pressable>
            ) : null}
          </ThemedView>

          <OrderTimeline steps={timelineSteps} />

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
              <ThemedText style={styles.v}>
                {totals.shipping === 0 ? "Grátis" : formatCurrency(totals.shipping)}
              </ThemedText>
            </View>

            <View style={styles.divider} />

            <View style={styles.totalBox}>
              <ThemedText style={styles.totalLabel}>TOTAL</ThemedText>
              <ThemedText style={styles.totalValue}>{formatCurrency(totals.total)}</ThemedText>
            </View>

            <View style={[styles.divider, { marginTop: 14 }]} />

            <ThemedText style={styles.cardTitle}>Itens do pedido</ThemedText>

            {items.length ? (
              <View style={{ gap: 10 }}>
                {items.map((it) => (
                  <View key={it.productId} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <ThemedText numberOfLines={2} style={styles.itemTitle}>
                        {it.title}
                      </ThemedText>
                      <ThemedText style={styles.secondary}>
                        {it.qty}x {formatCurrency(it.price)}
                      </ThemedText>
                    </View>

                    <ThemedText style={styles.itemTotal}>{formatCurrency(it.lineTotal)}</ThemedText>
                  </View>
                ))}
              </View>
            ) : (
              <ThemedText style={styles.secondary}>Nenhum item encontrado neste pedido.</ThemedText>
            )}
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

  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  iconBtnText: { fontFamily: "OpenSans", fontSize: 12, fontWeight: "700", color: theme.colors.text },

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

  secondary: { fontFamily: "OpenSans", fontSize: 12, color: "rgba(0,0,0,0.65)" },
  boldText: { fontFamily: "OpenSans", fontSize: 12, fontWeight: "700", color: theme.colors.text },

  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  statusChipText: { fontFamily: "OpenSans", fontSize: 12, fontWeight: "700", color: theme.colors.primary },

  actionRow: { flexDirection: "row", gap: Spacing.md },

  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
  },
  actionBtnDisabled: { opacity: 0.45 },
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

  devBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  devBtnText: { fontFamily: "OpenSans", fontSize: 12, fontWeight: "700", color: theme.colors.text },

  kv: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  k: { fontFamily: "OpenSans", fontSize: 12, color: "rgba(0,0,0,0.65)" },
  v: { fontFamily: "OpenSans", fontSize: 12, fontWeight: "700", color: theme.colors.text },

  totalBox: {
    backgroundColor: "#F59E0B",
    borderRadius: Radius.xl,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  totalLabel: { fontFamily: "OpenSans", fontSize: 12, fontWeight: "700", color: "#000" },
  totalValue: { fontFamily: "OpenSans", fontSize: 14, fontWeight: "700", color: "#000" },

  itemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  itemTitle: { fontFamily: "OpenSans", fontSize: 12, fontWeight: "700", color: theme.colors.text },
  itemTotal: { fontFamily: "OpenSans", fontSize: 12, fontWeight: "700", color: theme.colors.text },
});
