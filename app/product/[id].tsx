import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "../../components/AppHeader";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { isFlagEnabled } from "../../constants/flags";
import theme from "../../constants/theme";
import { useCart } from "../../context/CartContext";
import { track } from "../../lib/analytics";
import { startCheckout } from "../../lib/checkout";
import { formatCEP, isValidCEP, normalizeCEP } from "../../utils/cep";
import { patchOrderDraft } from "../../utils/orderDraftPatch";
import { loadOrderDraft, saveOrderDraft } from "../../utils/orderStorage";
import { getShippingQuote } from "../../utils/shippingService";

// Fonte primária
import { products as productsV1 } from "../../constants/products";
// Fallback
import { products as productsV2 } from "../../data/catalog";

type ProductUnified = {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  category?: string;
  price: number;
  image?: any;
  badge?: string;
  rating?: number;
  reviewsCount?: number;
};

function toUnified(p: any): ProductUnified {
  return {
    id: String(p?.id ?? ""),
    name: p?.name,
    title: p?.title,
    description: p?.description,
    category: p?.category,
    price: Number(p?.price ?? 0),
    image: p?.image,
    badge: p?.badge,
    rating: typeof p?.rating === "number" ? p.rating : undefined,
    reviewsCount: typeof p?.reviewsCount === "number" ? p.reviewsCount : undefined,
  };
}

function formatBRL(value: number) {
  const fixed = (Number.isFinite(value) ? value : 0).toFixed(2).replace(".", ",");
  return `R$ ${fixed}`;
}

function getProductById(id: string): ProductUnified | null {
  const a = (productsV1 as any[])?.find((x) => String(x?.id) === String(id));
  if (a) return toUnified(a);

  const b = (productsV2 as any[])?.find((x) => String(x?.id) === String(id));
  if (b) return toUnified(b);

  return null;
}

export default function ProductDetails() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const id = String((params as any)?.id ?? "");
  const source = String((params as any)?.source ?? "unknown");

  const cartCtx = useCart() as any;

  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState<number>(1);

  // CEP / frete
  const [cep, setCep] = useState<string>("");
  const [shippingText, setShippingText] = useState<string>("");
  const [shippingLoading, setShippingLoading] = useState(false);

  const product = useMemo(() => (id ? getProductById(id) : null), [id]);

  useEffect(() => {
    if (!id) return;
    if (!isFlagEnabled("ff_pdp_v1")) return;

    try {
      track("pdp_view", { product_id: id, source });
    } catch {}
  }, [id, source]);

  // Prefill CEP/frete do draft (persistência)
  useEffect(() => {
    if (!isFlagEnabled("ff_pdp_shipping_cep_v1")) return;

    (async () => {
      const d = await loadOrderDraft();
      if (!d) return;

      const z = (d.address as any)?.zip ? String((d.address as any).zip) : "";
      if (z) setCep(formatCEP(z));

      const s = d.shipping;
      if (s?.deadline) {
        const priceLabel = s.price === 0 ? "Frete grátis" : `Frete: ${formatBRL(s.price)}`;
        setShippingText(`${priceLabel} • ${s.deadline}`);
      }
    })();
  }, []);

  function clampQty(n: number) {
    const v = Math.max(1, Math.min(99, Math.floor(n)));
    return Number.isFinite(v) ? v : 1;
  }

  function setQtySafe(next: number) {
    const v = clampQty(next);
    setQty(v);
    try {
      if (isFlagEnabled("ff_pdp_v1")) {
        track("pdp_qty_change", { product_id: id, qty: v });
      }
    } catch {}
  }

  function cartAdd(productId: string, quantity: number) {
    const any = cartCtx as any;
    const fn =
      any?.addItem?.bind(any) ||
      any?.add?.bind(any) ||
      any?.addToCart?.bind(any) ||
      any?.increase?.bind(any) ||
      any?.increment?.bind(any);

    if (!fn) return;

    try {
      fn(
        {
          id: productId,
          title: product?.title ?? product?.name ?? "Produto",
          price: product?.price ?? 0,
          category: product?.category ?? "",
          image: product?.image ?? "",
        },
        quantity,
      );
      return;
    } catch {}

    try {
      fn(productId, quantity);
    } catch {}
  }

  function handleAddToCart() {
    if (!product) return;
    if (!isFlagEnabled("ff_pdp_v1")) return;

    cartAdd(product.id, qty);

    try {
      track("pdp_add_to_cart", {
        product_id: String(product.id),
        price: Number(product.price ?? 0),
        qty,
      });
    } catch {}

    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  function handleBuyNow() {
    if (!product) return;
    if (!isFlagEnabled("ff_pdp_v1")) return;
    if (!isFlagEnabled("ff_pdp_buy_now_v1")) return;

    cartAdd(product.id, qty);

    try {
      track("pdp_buy_now", {
        product_id: String(product.id),
        price: Number(product.price ?? 0),
        qty,
        source,
      });
    } catch {}

    try {
      startCheckout({
        source:
          source === "cart" || source === "pdp" || source === "home"
            ? (source as any)
            : "unknown",
        subtotal: Number(product.price ?? 0) * qty,
        items_count: qty,
      });
    } catch {
      try {
        router.push("/checkout" as any);
      } catch {
        try {
          router.push("/(tabs)/checkout" as any);
        } catch {}
      }
    }
  }

  async function handleQuoteShipping() {
    if (!product) return;
    if (!isFlagEnabled("ff_pdp_shipping_cep_v1")) return;

    const norm = normalizeCEP(cep);
    if (!isValidCEP(norm)) {
      setShippingText("CEP inválido. Use 8 dígitos.");
      return;
    }

    setShippingLoading(true);

    try {
      const quote = getShippingQuote({ cep: norm, subtotal: product.price * qty });
      if (!quote) {
        setShippingText("Não foi possível calcular o frete.");
        return;
      }

      const priceLabel = quote.price === 0 ? "Frete grátis" : `Frete: ${formatBRL(quote.price)}`;
      const nextText = `${priceLabel} • ${quote.deadline}`;
      setShippingText(nextText);

      // Persistir no draft (address.zip + shipping)
      const d = await loadOrderDraft();
      if (d) {
        const next = patchOrderDraft(d, {
          address: {
            ...(d.address ?? { id: "addr_default" }),
            zip: norm,
          },
          shipping: quote,
        });
        await saveOrderDraft(next);
      }

      try {
        track("pdp_shipping_quote", {
          product_id: String(product.id),
          source,
          cep_prefix: norm.slice(0, 3),
          price: quote.price,
          deadline: quote.deadline,
          method: quote.method,
          subtotal: Number(product.price ?? 0) * qty,
        });
      } catch {}
    } finally {
      setShippingLoading(false);
    }
  }

  function handleBack() {
    router.back();
  }

  if (!isFlagEnabled("ff_pdp_v1")) {
    return (
      <ThemedView style={[styles.screen, { paddingTop: insets.top }]}>
        <AppHeader title="Produto" showBack />
        <View style={styles.content}>
          <ThemedText type="defaultSemiBold" style={styles.title}>
            Em breve
          </ThemedText>
          <ThemedText style={styles.text}>
            A página de produto está desativada no momento.
          </ThemedText>

          <Pressable onPress={handleBack} style={styles.secondaryBtn}>
            <ThemedText type="defaultSemiBold" style={styles.secondaryBtnText}>
              Voltar
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  if (!product) {
    return (
      <ThemedView style={[styles.screen, { paddingTop: insets.top }]}>
        <AppHeader title="Produto" showBack />
        <View style={styles.content}>
          <ThemedText type="defaultSemiBold" style={styles.title}>
            Produto não encontrado
          </ThemedText>
          <ThemedText style={styles.text}>ID: {id || "—"}</ThemedText>

          <Pressable onPress={handleBack} style={styles.secondaryBtn}>
            <ThemedText type="defaultSemiBold" style={styles.secondaryBtnText}>
              Voltar
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  const name = (product.title ?? product.name ?? "").trim() || "Produto";
  const rating = typeof product.rating === "number" ? product.rating : 4.7;
  const reviewsCount =
    typeof product.reviewsCount === "number" ? product.reviewsCount : 120;

  const totalShown = product.price * qty;
  const buyNowEnabled = isFlagEnabled("ff_pdp_buy_now_v1");
  const shippingEnabled = isFlagEnabled("ff_pdp_shipping_cep_v1");

  return (
    <ThemedView style={[styles.screen, { paddingTop: insets.top }]}>
      <AppHeader title="Produto" showBack />

      <View style={[styles.content, { paddingBottom: 150 + insets.bottom }]}>
        <View style={styles.imageWrap}>
          <Image
            source={product.image}
            contentFit="cover"
            transition={120}
            style={styles.image}
            accessibilityLabel={name}
          />
        </View>

        <View style={styles.block}>
          <ThemedText type="defaultSemiBold" style={styles.title}>
            {name}
          </ThemedText>

          {product.badge ? (
            <ThemedText type="caption" style={styles.badge}>
              {product.badge}
            </ThemedText>
          ) : null}

          <ThemedText type="defaultSemiBold" style={styles.price}>
            {formatBRL(product.price)}
          </ThemedText>

          <ThemedText type="caption" style={styles.muted}>
            ⭐ {rating.toFixed(1)} • {reviewsCount} avaliações
          </ThemedText>

          <View style={styles.qtyRow}>
            <ThemedText type="caption" style={styles.muted}>
              Quantidade
            </ThemedText>

            <View style={styles.qtyControls}>
              <Pressable
                onPress={() => setQtySafe(qty - 1)}
                style={({ pressed }) => [styles.qtyBtn, pressed ? { opacity: 0.85 } : null]}
              >
                <ThemedText type="defaultSemiBold" style={styles.qtyBtnText}>
                  −
                </ThemedText>
              </Pressable>

              <View style={styles.qtyValue}>
                <ThemedText type="defaultSemiBold" style={styles.qtyValueText}>
                  {qty}
                </ThemedText>
              </View>

              <Pressable
                onPress={() => setQtySafe(qty + 1)}
                style={({ pressed }) => [styles.qtyBtn, pressed ? { opacity: 0.85 } : null]}
              >
                <ThemedText type="defaultSemiBold" style={styles.qtyBtnText}>
                  +
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Frete por CEP */}
        {shippingEnabled ? (
          <View style={styles.block}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Calcular frete
            </ThemedText>

            <View style={styles.cepRow}>
              <TextInput
                value={cep}
                onChangeText={(t) => setCep(formatCEP(t))}
                placeholder="CEP (ex: 01001-000)"
                placeholderTextColor="rgba(0,0,0,0.45)"
                keyboardType="number-pad"
                maxLength={9}
                style={styles.cepInput}
              />

              <Pressable
                onPress={handleQuoteShipping}
                disabled={shippingLoading}
                style={({ pressed }) => [
                  styles.cepBtn,
                  pressed ? { opacity: 0.92 } : null,
                  shippingLoading ? { opacity: 0.6 } : null,
                ]}
              >
                <ThemedText type="defaultSemiBold" style={styles.cepBtnText}>
                  {shippingLoading ? "..." : "Calcular"}
                </ThemedText>
              </Pressable>
            </View>

            {shippingText ? (
              <ThemedText type="caption" style={styles.muted}>
                {shippingText}
              </ThemedText>
            ) : (
              <ThemedText type="caption" style={styles.muted}>
                Informe seu CEP para ver preço e prazo.
              </ThemedText>
            )}
          </View>
        ) : null}

        <View style={styles.block}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Descrição
          </ThemedText>
          <ThemedText style={styles.text}>
            {(product.description ?? "").trim() ||
              "Detalhes do produto serão exibidos aqui."}
          </ThemedText>
        </View>

        <View style={styles.block}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Confiança
          </ThemedText>
          <ThemedText style={styles.text}>
            Compra garantida • Devolução facilitada • Suporte no app
          </ThemedText>
        </View>
      </View>

      <View
        style={[
          styles.ctaBar,
          {
            paddingBottom: 12 + insets.bottom,
            borderTopColor: theme.colors.divider,
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <View style={styles.ctaLeft}>
          <ThemedText type="caption" style={styles.muted}>
            Total
          </ThemedText>
          <ThemedText type="defaultSemiBold" style={styles.ctaPrice}>
            {formatBRL(totalShown)}
          </ThemedText>
        </View>

        <View style={styles.ctaRight}>
          {buyNowEnabled ? (
            <Pressable
              onPress={handleBuyNow}
              style={({ pressed }) => [
                styles.ctaBtnSecondary,
                pressed ? { opacity: 0.9 } : null,
              ]}
            >
              <ThemedText type="defaultSemiBold" style={styles.ctaBtnSecondaryText}>
                Comprar agora
              </ThemedText>
            </Pressable>
          ) : null}

          <Pressable
            onPress={handleAddToCart}
            style={({ pressed }) => [styles.ctaBtn, pressed ? { opacity: 0.9 } : null]}
          >
            <ThemedText type="defaultSemiBold" style={styles.ctaBtnText}>
              {added ? "Adicionado ✓" : "Adicionar"}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  imageWrap: {
    height: 280,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },

  image: {
    width: "100%",
    height: "100%",
  },

  block: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    gap: 10,
  },

  title: { fontSize: 18 },
  price: { fontSize: 20 },
  sectionTitle: { fontSize: 14 },

  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    opacity: 0.9,
  },

  text: { fontSize: 13, opacity: 0.9 },
  muted: { fontSize: 12, opacity: 0.7 },

  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    alignItems: "center",
    justifyContent: "center",
  },

  qtyBtnText: { fontSize: 16 },

  qtyValue: {
    minWidth: 42,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  qtyValueText: { fontSize: 14 },

  cepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  cepInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: 12,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },

  cepBtn: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF1F5",
  },

  cepBtnText: { color: "#000" },

  ctaBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  ctaLeft: { flex: 1 },
  ctaPrice: { fontSize: 16 },

  ctaRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  ctaBtnSecondary: {
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },

  ctaBtnSecondaryText: { color: theme.colors.text },

  ctaBtn: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },

  ctaBtnText: { color: "#000" },

  secondaryBtn: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  secondaryBtnText: { textAlign: "center" },
});