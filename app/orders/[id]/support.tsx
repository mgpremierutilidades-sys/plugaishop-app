// app/orders/[id]/support.tsx
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../../../components/themed-text";
import { ThemedView } from "../../../components/themed-view";
import theme, { Radius, Spacing } from "../../../constants/theme";
import type { Order } from "../../../utils/ordersStore";
import { getOrderById, normalizeStatusLabel } from "../../../utils/ordersStore";

function safeString(v: unknown) {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
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

function faqByStatus(status?: string) {
  const s = (status ?? "confirmed").toString();

  if (s === "confirmed") {
    return [
      { q: "Posso alterar o endereço?", a: "Sim. Enquanto não enviarmos o pedido, você pode solicitar alteração pelo suporte." },
      { q: "Quando meu pedido será pago?", a: "Pagamentos podem levar alguns minutos. Em Pix, costuma ser imediato." },
      { q: "Posso cancelar?", a: "Em fase confirmada, normalmente é possível. Fale com o suporte para validar." },
    ];
  }
  if (s === "paid") {
    return [
      { q: "Quando será enviado?", a: "Após separação e embalagem, o pedido é despachado. Você verá o status ‘Enviado’." },
      { q: "Posso trocar itens?", a: "Após pagamento, trocas dependem do item e do estágio logístico. Fale com o suporte." },
    ];
  }
  if (s === "shipped") {
    return [
      { q: "Como rastreio?", a: "Use o botão de rastreio. Quando disponível, o código aparece no rastreamento." },
      { q: "Meu pedido atrasou", a: "Atrasos podem ocorrer por rota/transportadora. Informe o ID ao suporte para prioridade." },
    ];
  }
  return [
    { q: "Meu pedido chegou com problema", a: "Nos chame no suporte com fotos e ID do pedido. Vamos resolver rápido." },
    { q: "Troca ou devolução", a: "Você pode solicitar conforme política. O suporte orienta todo o passo a passo." },
  ];
}

export default function OrderSupportScreen() {
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

  const faq = useMemo(() => faqByStatus(order?.status), [order?.status]);
  const statusLabel = useMemo(() => normalizeStatusLabel(order?.status ?? "pending"), [order?.status]);

  const onCopyId = async () => {
    if (!orderId) return;
    const ok = await copyToClipboard(orderId);
    if (ok) Alert.alert("Copiado", "ID do pedido copiado para a área de transferência.");
    else Alert.alert("Copiar ID", `Copie manualmente: ${orderId}`);
  };

  const onWhatsApp = async () => {
    const message = `Olá! Preciso de suporte para o pedido #${orderId}.`;
    const url = `https://wa.me/5500000000000?text=${encodeURIComponent(message)}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("WhatsApp", "Não foi possível abrir o WhatsApp neste dispositivo.");
      return;
    }
    Linking.openURL(url);
  };

  const onEmail = async () => {
    const subject = `Suporte - Pedido #${orderId}`;
    const body = `Olá, preciso de ajuda com o pedido #${orderId}.\n\nStatus atual: ${statusLabel}\n`;
    const url = `mailto:contato@plugaishop.com.br?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("E-mail", "Não foi possível abrir o app de e-mail neste dispositivo.");
      return;
    }
    Linking.openURL(url);
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <ThemedView style={styles.container}>
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <ThemedText style={styles.backArrow}>←</ThemedText>
          </Pressable>

          <ThemedText style={styles.title}>Suporte</ThemedText>

          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ThemedView style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.cardTitle}>Pedido #{orderId}</ThemedText>
                <ThemedText style={styles.secondary}>
                  Status: <ThemedText style={styles.bold}>{statusLabel}</ThemedText>
                </ThemedText>
              </View>

              <Pressable onPress={onCopyId} style={styles.smallBtn}>
                <ThemedText style={styles.smallBtnText}>Copiar ID</ThemedText>
              </Pressable>
            </View>

            <View style={styles.divider} />

            <View style={styles.actionRow}>
              <Pressable onPress={onWhatsApp} style={styles.actionBtn}>
                <ThemedText style={styles.actionBtnText}>WhatsApp</ThemedText>
              </Pressable>

              <Pressable onPress={onEmail} style={styles.actionBtnOutline}>
                <ThemedText style={styles.actionBtnOutlineText}>E-mail</ThemedText>
              </Pressable>
            </View>
          </ThemedView>

          <ThemedView style={styles.card}>
            <ThemedText style={styles.cardTitle}>Perguntas rápidas</ThemedText>

            <View style={{ gap: 10 }}>
              {faq.map((item, idx) => (
                <ThemedView key={idx} style={styles.faqBox}>
                  <ThemedText style={styles.faqQ}>{item.q}</ThemedText>
                  <ThemedText style={styles.faqA}>{item.a}</ThemedText>
                </ThemedView>
              ))}
            </View>
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

  secondary: { fontFamily: "OpenSans", fontSize: 12, color: "rgba(0,0,0,0.65)" },
  bold: { fontWeight: "700", color: theme.colors.text },

  faqBox: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: 12,
    gap: 6,
  },
  faqQ: { fontFamily: "OpenSans", fontSize: 12, fontWeight: "700", color: theme.colors.text },
  faqA: { fontFamily: "OpenSans", fontSize: 12, color: "rgba(0,0,0,0.70)", lineHeight: 16 },
});
