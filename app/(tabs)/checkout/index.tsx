import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../../../components/themed-text";
import { ThemedView } from "../../../components/themed-view";
import { isFlagEnabled } from "../../../constants/flags";
import theme from "../../../constants/theme";
import { useCart } from "../../../context/CartContext";
import { track } from "../../../lib/analytics";
import { formatCurrency } from "../../../utils/formatCurrency";

const FONT_BODY = "OpenSans_400Regular";
const FONT_BODY_BOLD = "OpenSans_700Bold";
const FONT_TITLE = "Arimo_400Regular";

function ComingSoon(title: string) {
  Alert.alert(title, "Em breve no Plugaí Shop.");
}

export default function CheckoutIndex() {
  const cart = useCart() as any;

  const goBack = () => router.back();
  const push = (path: string) => router.push(path as any);

  const checkoutUiV1 = isFlagEnabled("ff_checkout_ui_v1");

  
  const checkoutAddressV1 = isFlagEnabled("ff_checkout_address_v1");
const itemsCount = useMemo(() => {
    const items = (cart?.items ?? []) as any[];
    return Array.isArray(items) ? items.reduce((acc, it) => acc + (it?.qty ?? 1), 0) : 0;
  }, [cart?.items]);

  const subtotal = useMemo(() => Number(cart?.subtotal ?? 0), [cart?.subtotal]);

  // frete estimado simples (placeholder)
  const shippingEstimate = useMemo(() => {
    if (!checkoutUiV1) return 0;
    if (subtotal >= 199) return 0;
    if (subtotal <= 0) return 0;
    return 19.9;
  }, [subtotal, checkoutUiV1]);

  const total = useMemo(() => subtotal + shippingEstimate, [subtotal, shippingEstimate]);

  const [submitting, setSubmitting] = useState(false);

  const onContinue = () => {
    if (isFlagEnabled("ff_cart_analytics_v1")) {
      track("checkout_cta_tap", {
        step: "checkout_index",
        items_count: itemsCount,
        subtotal,
        shipping_estimate: shippingEstimate,
        total,
      });
    }
    push(checkoutAddressV1 ? "/checkout/address" : "/checkout/shipping");
  };

  const onFinish = async () => {
    if (submitting) return;

    if (itemsCount <= 0) {
      Alert.alert("Carrinho vazio", "Adicione itens antes de finalizar.");
      return;
    }

    setSubmitting(true);

    try {
      if (isFlagEnabled("ff_cart_analytics_v1")) {
        track("checkout_finish_tap", {
          items_count: itemsCount,
          subtotal,
          shipping_estimate: shippingEstimate,
          total,
        });
      }

      // placeholder: fluxo real virá em CHECKOUT-003 (payment+place order)
      ComingSoon("Finalizar compra");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={goBack}
            hitSlop={12}
            style={styles.backBtn}
            accessibilityRole="button"
          >
            <ThemedText style={styles.backIcon}>←</ThemedText>
          </Pressable>

          <ThemedText style={styles.title}>Finalizar compra</ThemedText>
          <View style={styles.rightSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Resumo */}
          <View style={styles.card}>
            <ThemedText style={styles.sectionTitle}>Resumo do pedido</ThemedText>

            <View style={styles.row}>
              <ThemedText style={styles.label}>Itens</ThemedText>
              <ThemedText style={styles.value}>{itemsCount}</ThemedText>
            </View>

            <View style={styles.row}>
              <ThemedText style={styles.label}>Subtotal</ThemedText>
              <ThemedText style={styles.value}>{formatCurrency(subtotal)}</ThemedText>
            </View>

            {checkoutUiV1 ? (
              <View style={styles.row}>
                <ThemedText style={styles.label}>Frete estimado</ThemedText>
                <ThemedText style={styles.value}>
                  {shippingEstimate === 0 ? "Grátis" : formatCurrency(shippingEstimate)}
                </ThemedText>
              </View>
            ) : null}

            <View style={[styles.row, { borderBottomWidth: 0 }]}>
              <ThemedText style={[styles.label, { opacity: 0.95 }]}>Total</ThemedText>
              <ThemedText style={[styles.value, { fontSize: 14 }]}>
                {formatCurrency(total)}
              </ThemedText>
            </View>

            <Pressable
              onPress={onContinue}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed ? { opacity: 0.92 } : null,
              ]}
              accessibilityRole="button"
            >
              <ThemedText style={styles.primaryBtnText}>CONTINUAR</ThemedText>
            </Pressable>
          </View>

          {/* Confiança */}
          <View style={styles.trustCard}>
            <ThemedText style={styles.trustTitle}>Compra com confiança</ThemedText>

            <View style={styles.trustRow}>
              <ThemedText style={styles.trustBullet}>•</ThemedText>
              <ThemedText style={styles.trustText}>Pagamento seguro</ThemedText>
            </View>
            <View style={styles.trustRow}>
              <ThemedText style={styles.trustBullet}>•</ThemedText>
              <ThemedText style={styles.trustText}>Suporte e acompanhamento</ThemedText>
            </View>
            <View style={styles.trustRow}>
              <ThemedText style={styles.trustBullet}>•</ThemedText>
              <ThemedText style={styles.trustText}>Política de devolução</ThemedText>
            </View>
          </View>

          {/* Blocos “Em breve” (mantive, mas sem ocupar o fluxo principal) */}
          <View style={styles.promoWrap}>
            <Pressable
              onPress={() => ComingSoon("JOGOS")}
              style={[styles.promoCard, styles.promoCardA]}
              accessibilityRole="button"
            >
              <ThemedText style={styles.promoTitle}>JOGOS</ThemedText>
              <ThemedText style={styles.promoSubtitle}>
                Desafios, prêmios e novidades
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => ComingSoon("VÍDEOS")}
              style={[styles.promoCard, styles.promoCardB]}
              accessibilityRole="button"
            >
              <ThemedText style={styles.promoTitle}>VÍDEOS</ThemedText>
              <ThemedText style={styles.promoSubtitle}>
                Conteúdo rápido e ofertas
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.helpCard}>
            <ThemedText style={styles.helpTitle}>Precisa de ajuda?</ThemedText>
            <ThemedText style={styles.helpText}>
              Você poderá editar endereço, frete e pagamento nas próximas etapas.
            </ThemedText>
          </View>
        </ScrollView>

        {/* CTA fixo */}
        <View style={styles.stickyFooter}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.stickyLabel}>Total</ThemedText>
            <ThemedText style={styles.stickyValue}>{formatCurrency(total)}</ThemedText>
          </View>

          <Pressable
            onPress={onFinish}
            disabled={submitting || itemsCount <= 0}
            style={({ pressed }) => [
              styles.stickyBtn,
              (submitting || itemsCount <= 0) ? { opacity: 0.55 } : null,
              pressed && !(submitting || itemsCount <= 0) ? { opacity: 0.92 } : null,
            ]}
            accessibilityRole="button"
          >
            <ThemedText style={styles.stickyBtnText}>
              {submitting ? "Processando..." : "FINALIZAR"}
            </ThemedText>
          </Pressable>
        </View>
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: { fontSize: 22, fontFamily: FONT_BODY_BOLD },
  rightSpacer: { width: 40, height: 40 },
  title: { fontSize: 20, fontFamily: FONT_TITLE, textAlign: "center" },

  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: 14,
  },
  sectionTitle: { fontSize: 14, fontFamily: FONT_BODY_BOLD, marginBottom: 10 },

  row: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  label: { fontSize: 12, fontFamily: FONT_BODY, opacity: 0.85 },
  value: { fontSize: 12, fontFamily: FONT_BODY_BOLD },

  primaryBtn: {
    marginTop: 14,
    height: 44,
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

  trustCard: {
    marginTop: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: 14,
  },
  trustTitle: { fontSize: 12, fontFamily: FONT_BODY_BOLD, marginBottom: 10 },
  trustRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  trustBullet: { fontFamily: FONT_BODY_BOLD, opacity: 0.9 },
  trustText: { fontSize: 12, fontFamily: FONT_BODY, opacity: 0.92 },

  promoWrap: {
    marginTop: 12,
    gap: 10,
  },
  promoCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  promoCardA: {},
  promoCardB: {},

  promoTitle: {
    fontSize: 12,
    fontFamily: FONT_BODY_BOLD,
    textTransform: "uppercase",
  },
  promoSubtitle: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: FONT_BODY,
    opacity: 0.9,
  },

  helpCard: {
    marginTop: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: 14,
  },
  helpTitle: { fontSize: 12, fontFamily: FONT_BODY_BOLD, marginBottom: 6 },
  helpText: { fontSize: 12, fontFamily: FONT_BODY, opacity: 0.9 },

  stickyFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    backgroundColor: theme.colors.background,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stickyLabel: { fontSize: 12, fontFamily: FONT_BODY, color: theme.colors.textMuted },
  stickyValue: { fontSize: 16, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },

  stickyBtn: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stickyBtnText: { color: "#fff", fontSize: 12, fontFamily: FONT_BODY_BOLD },
});
