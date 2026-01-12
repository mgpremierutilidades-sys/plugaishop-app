// app/(tabs)/cart.tsx
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  TextInput,
  View,
  type ImageSourcePropType,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import theme from "../../constants/theme";
import { useCart } from "../../context/CartContext";
import type { Product } from "../../data/catalog";
import { products } from "../../data/catalog";
import { formatCurrency } from "../../utils/formatCurrency";

const FONT_TITLE = "Arimo_400Regular";
const FONT_BODY = "OpenSans_400Regular";
const FONT_BODY_BOLD = "OpenSans_700Bold";

// ==== Regras congeladas do Carrinho (teste/UX) ====
// - Total em box laranja com letra preta
// - Rodapé com banner verde musgo “Continuar a compra” (mais fino), texto 16 bold
const CTA_GREEN = "#3F5A3A";

// Mock de frete / promo
const SHIPPING_BASE = 19.9;
const FREE_SHIPPING_THRESHOLD = 149.9;

// Cupons (mock simples)
type Coupon = { code: string; percent: number };
const COUPONS: Coupon[] = [
  { code: "PLUGA10", percent: 10 },
  { code: "PLUGA15", percent: 15 },
  { code: "FRETE", percent: 0 },
];

type CartRow = {
  type: "cart";
  id: string;
  title: string;
  price: number;
  qty: number;
  image?: ImageSourcePropType;
};

type DealRow = {
  type: "deal";
  id: string;
  title: string;
  price: number;
  image?: ImageSourcePropType;
};

type Row = CartRow | DealRow;

type CartSection = {
  title: string;
  data: Row[];
};

function toImageSource(img: any): ImageSourcePropType | undefined {
  if (!img) return undefined;
  if (typeof img === "number") return img;
  if (typeof img === "string") {
    if (img.startsWith("http")) return { uri: img };
    return undefined;
  }
  return img as ImageSourcePropType;
}

function findProductById(id: string) {
  return (products as Product[]).find((p) => String(p.id) === String(id));
}

function normalizeCepDigits(raw: string) {
  return String(raw ?? "").replace(/\D/g, "").slice(0, 8);
}

export default function CartTab() {
  const cartCtx = useCart() as any;

  // ---- Lê itens do contexto com fallback robusto ----
  const cartRows: CartRow[] = useMemo(() => {
    const ctxItems = cartCtx?.items ?? cartCtx?.cartItems ?? cartCtx?.cart ?? null;

    // Formato A: array
    if (Array.isArray(ctxItems)) {
      const mapped = ctxItems
        .map((it: any) => {
          const p = it?.product ?? it;
          const qty = Number(it?.qty ?? it?.quantity ?? 1);
          const id = p?.id ?? it?.id ?? it?.productId;
          if (!id) return null;

          const price = Number(p?.price ?? it?.price ?? 0);
          const title = String(p?.title ?? it?.title ?? "Produto");
          const image = toImageSource(p?.image ?? it?.image);

          return {
            type: "cart",
            id: String(id),
            title,
            price,
            qty: Math.max(1, Number.isFinite(qty) ? qty : 1),
            image,
          } as CartRow;
        })
        .filter(Boolean) as CartRow[];

      return mapped;
    }

    // Formato B: objeto { [id]: qty }
    if (ctxItems && typeof ctxItems === "object") {
      const mapped = Object.keys(ctxItems).map((id) => {
        const qty = Number((ctxItems as any)[id] ?? 1);
        const p = findProductById(String(id));
        return {
          type: "cart",
          id: String(id),
          title: String(p?.title ?? "Produto"),
          price: Number(p?.price ?? 0),
          qty: Math.max(1, Number.isFinite(qty) ? qty : 1),
          image: toImageSource((p as any)?.image),
        } as CartRow;
      });
      return mapped;
    }

    // Sem contexto -> vazio (não inventa carrinho cheio)
    return [];
  }, [cartCtx]);

  const hasCart = cartRows.length > 0;

  // Checkbox: tudo marcado por padrão (igual estava)
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const r of cartRows) next[r.id] = true;
    setSelected(next);
  }, [cartRows]);

  function toggleSelect(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function safeAdd(productId: string) {
    const p = findProductById(productId);
    if (!p) return;

    const any = cartCtx as any;
    const fn =
      any?.addItem?.bind(any) ||
      any?.add?.bind(any) ||
      any?.addToCart?.bind(any) ||
      any?.increase?.bind(any) ||
      any?.increment?.bind(any);

    if (fn) {
      fn(p, 1);
      return;
    }
  }

  function safeDec(productId: string) {
    const p = findProductById(productId);
    if (!p) return;

    const any = cartCtx as any;
    const fn =
      any?.decItem?.bind(any) ||
      any?.decrease?.bind(any) ||
      any?.dec?.bind(any) ||
      any?.decrement?.bind(any) ||
      any?.removeOne?.bind(any);

    if (fn) {
      fn(p, 1);
      return;
    }
  }

  function safeRemove(productId: string) {
    const any = cartCtx as any;
    const fn =
      any?.removeItem?.bind(any) ||
      any?.remove?.bind(any) ||
      any?.removeFromCart?.bind(any) ||
      any?.deleteItem?.bind(any) ||
      any?.clearItem?.bind(any);

    if (fn) {
      fn(productId);
      return;
    }
  }

  function removeSelected() {
    const ids = cartRows.map((r) => r.id).filter((id) => !!selected[id]);
    if (ids.length === 0) return;
    for (const id of ids) safeRemove(id);
  }

  // ---- Produtos imperdíveis (sempre aparecem; garantem scroll) ----
  const dealRows: DealRow[] = useMemo(() => {
    // pega um bloco maior para garantir rolagem quando carrinho vazio
    const list = (products as Product[]).slice(0, 14);
    return list.map((p) => ({
      type: "deal",
      id: String(p.id),
      title: String(p.title),
      price: Number(p.price ?? 0),
      image: toImageSource((p as any).image),
    }));
  }, []);

  const selectedCount = useMemo(() => {
    return cartRows.reduce((acc, r) => acc + (selected[r.id] ? 1 : 0), 0);
  }, [cartRows, selected]);

  // ---- Descontos por item (discountPercent do catálogo) apenas selecionados ----
  const itemDiscountTotal = useMemo(() => {
    return cartRows.reduce((acc, r) => {
      if (!selected[r.id]) return acc;
      const p = findProductById(r.id);
      const pct = Number((p as any)?.discountPercent ?? 0);
      if (!Number.isFinite(pct) || pct <= 0) return acc;
      const d = (Number(r.price) * pct) / 100;
      return acc + d * r.qty;
    }, 0);
  }, [cartRows, selected]);

  // ---- Subtotal bruto (antes de descontos) apenas selecionados ----
  const subtotal = useMemo(() => {
    return cartRows.reduce((acc, r) => {
      if (!selected[r.id]) return acc;
      return acc + r.price * r.qty;
    }, 0);
  }, [cartRows, selected]);

  // ---- Cupom (mock) ----
  const [couponInput, setCouponInput] = useState<string>("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  function applyCoupon() {
    const code = String(couponInput ?? "").trim().toUpperCase();
    if (!code) {
      setAppliedCoupon(null);
      setCouponError("Digite um cupom.");
      return;
    }

    const found = COUPONS.find((c) => c.code === code);
    if (!found) {
      setAppliedCoupon(null);
      setCouponError("Cupom inválido.");
      return;
    }

    setCouponError(null);
    setAppliedCoupon(found);
  }

  const couponDiscount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.code === "FRETE") return 0;
    const pct = Number(appliedCoupon.percent ?? 0);
    if (!Number.isFinite(pct) || pct <= 0) return 0;

    // cupom aplicado sobre o valor após desconto de item (prática comum)
    const base = Math.max(0, subtotal - itemDiscountTotal);
    return (base * pct) / 100;
  }, [appliedCoupon, subtotal, itemDiscountTotal]);

  // ---- Entrega (mock) ----
  const [deliveryMode, setDeliveryMode] = useState<"delivery" | "pickup">("delivery");
  const [cepInput, setCepInput] = useState<string>("");
  const [cepTouched, setCepTouched] = useState(false);

  const cepDigits = useMemo(() => normalizeCepDigits(cepInput), [cepInput]);
  const cepOk = cepDigits.length === 8;

  // valor após descontos (sem frete)
  const afterDiscounts = useMemo(() => {
    const v = subtotal - itemDiscountTotal - couponDiscount;
    return v < 0 ? 0 : v;
  }, [subtotal, itemDiscountTotal, couponDiscount]);

  // regra de frete grátis pelo valor após descontos (conservador)
  const qualifiesFreeShipping = afterDiscounts >= FREE_SHIPPING_THRESHOLD;

  const shipping = useMemo(() => {
    if (!hasCart) return 0;
    if (deliveryMode === "pickup") return 0;
    if (appliedCoupon?.code === "FRETE") return 0;
    if (qualifiesFreeShipping) return 0;
    if (!cepOk) return 0; // ainda não estimado
    return SHIPPING_BASE;
  }, [hasCart, deliveryMode, appliedCoupon, qualifiesFreeShipping, cepOk]);

  const total = useMemo(() => {
    const t = afterDiscounts + shipping;
    return t < 0 ? 0 : t;
  }, [afterDiscounts, shipping]);

  // progresso para frete grátis
  const freeShippingMissing = Math.max(0, FREE_SHIPPING_THRESHOLD - afterDiscounts);
  const freeShippingProgress =
    FREE_SHIPPING_THRESHOLD <= 0 ? 0 : Math.max(0, Math.min(1, afterDiscounts / FREE_SHIPPING_THRESHOLD));

  // Recomendações (carrossel) — simples e consistente: exclui itens já no carrinho
  const recommended = useMemo(() => {
    const inCart = new Set(cartRows.map((r) => String(r.id)));
    const list = (products as Product[])
      .filter((p) => !inCart.has(String(p.id)))
      .slice(0, 10);
    return list;
  }, [cartRows]);

  const sections: CartSection[] = useMemo(() => {
    return [
      { title: "Produtos", data: cartRows as Row[] },
      { title: "PRODUTOS IMPERDÍVEIS", data: dealRows as Row[] },
    ];
  }, [cartRows, dealRows]);

  function renderRow({ item }: { item: Row }) {
    if (item.type === "deal") {
      return (
        <Pressable
          onPress={() => router.push(`/product/${item.id}` as any)}
          style={styles.dealCard}
          accessibilityRole="button"
          accessibilityLabel={`Abrir produto ${item.title}`}
        >
          <View style={styles.dealImageWrap}>
            {item.image ? (
              <Image source={item.image} style={styles.dealImage} resizeMode="cover" />
            ) : (
              <View style={styles.dealImagePlaceholder} />
            )}
          </View>

          <View style={{ flex: 1 }}>
            <ThemedText numberOfLines={2} style={styles.dealTitle}>
              {item.title}
            </ThemedText>

            <ThemedText style={styles.dealPrice}>{formatCurrency(item.price)}</ThemedText>
          </View>
        </Pressable>
      );
    }

    const isChecked = !!selected[item.id];
    const p = findProductById(item.id);
    const pct = Number((p as any)?.discountPercent ?? 0);
    const hasPromo = Number.isFinite(pct) && pct > 0;
    const discountedUnit = hasPromo ? item.price - (item.price * pct) / 100 : item.price;
    const discountedUnitSafe = Number.isFinite(discountedUnit) ? Math.max(0, discountedUnit) : item.price;

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemTop}>
          <Pressable
            onPress={() => toggleSelect(item.id)}
            hitSlop={10}
            style={[styles.checkbox, isChecked ? styles.checkboxChecked : styles.checkboxUnchecked]}
            accessibilityRole="button"
            accessibilityLabel={isChecked ? "Desmarcar item" : "Marcar item"}
          >
            {isChecked ? <View style={styles.checkboxDot} /> : null}
          </Pressable>

          <View style={styles.itemImageWrap}>
            {item.image ? (
              <Image source={item.image} style={styles.itemImage} resizeMode="cover" />
            ) : (
              <View style={styles.itemImagePlaceholder} />
            )}
          </View>

          <View style={styles.itemInfo}>
            <ThemedText numberOfLines={2} style={styles.itemTitle}>
              {item.title}
            </ThemedText>

            <View style={styles.priceRow}>
              {hasPromo ? (
                <>
                  <ThemedText style={styles.price}>{formatCurrency(discountedUnitSafe)}</ThemedText>
                  <ThemedText style={styles.oldPrice}>{formatCurrency(item.price)}</ThemedText>
                </>
              ) : (
                <ThemedText style={styles.price}>{formatCurrency(item.price)}</ThemedText>
              )}
              <ThemedText style={styles.unit}> / un</ThemedText>
            </View>

            <View style={styles.qtyRow}>
              <Pressable
                onPress={() => safeDec(item.id)}
                style={styles.qtyBtn}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Diminuir quantidade"
              >
                <ThemedText style={styles.qtyBtnText}>-</ThemedText>
              </Pressable>

              <ThemedText style={styles.qtyText}>{item.qty}</ThemedText>

              <Pressable
                onPress={() => safeAdd(item.id)}
                style={styles.qtyBtn}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Aumentar quantidade"
              >
                <ThemedText style={styles.qtyBtnText}>+</ThemedText>
              </Pressable>

              <View style={{ marginLeft: "auto", alignItems: "flex-end" }}>
                <Pressable
                  onPress={() => safeRemove(item.id)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Remover item"
                >
                  <ThemedText style={styles.remove}>✕</ThemedText>
                </Pressable>

                <ThemedText style={styles.lineTotal}>
                  {formatCurrency(discountedUnitSafe * item.qty)}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Footer abaixo da lista de itens (somente quando tem carrinho)
  const listFooter = !hasCart ? (
    <View style={{ height: 10 }} />
  ) : (
    <View style={{ paddingTop: 6, paddingBottom: 10 }}>
      {/* Cupom + Remover selecionados */}
      <View style={styles.panelCard}>
        <View style={styles.panelHeaderRow}>
          <ThemedText style={styles.panelTitle}>Cupom</ThemedText>

          {selectedCount > 0 ? (
            <Pressable
              onPress={removeSelected}
              style={styles.removeSelectedBtn}
              accessibilityRole="button"
              accessibilityLabel="Remover itens selecionados"
            >
              <ThemedText style={styles.removeSelectedText}>Remover selecionados</ThemedText>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.couponRow}>
          <TextInput
            value={couponInput}
            onChangeText={(t) => {
              setCouponInput(t);
              setCouponError(null);
            }}
            placeholder="Digite seu cupom (ex.: PLUGA10)"
            placeholderTextColor="rgba(0,0,0,0.45)"
            style={styles.couponInput}
            autoCapitalize="characters"
            accessibilityLabel="Campo de cupom"
          />

          <Pressable onPress={applyCoupon} style={styles.couponOk} accessibilityRole="button" accessibilityLabel="Aplicar cupom">
            <ThemedText style={styles.couponOkText}>OK</ThemedText>
          </Pressable>
        </View>

        {couponError ? <ThemedText style={styles.helperError}>{couponError}</ThemedText> : null}
        {appliedCoupon ? (
          <ThemedText style={styles.helperOk}>
            Cupom aplicado: <ThemedText style={styles.helperOkStrong}>{appliedCoupon.code}</ThemedText>
          </ThemedText>
        ) : null}
      </View>

      {/* Frete grátis + entrega */}
      <View style={styles.panelCard}>
        <ThemedText style={styles.panelTitle}>Frete</ThemedText>

        {freeShippingMissing > 0 ? (
          <ThemedText style={styles.helperText}>
            Faltam <ThemedText style={styles.helperStrong}>{formatCurrency(freeShippingMissing)}</ThemedText> para frete grátis.
          </ThemedText>
        ) : (
          <ThemedText style={styles.helperOk}>
            Você ganhou <ThemedText style={styles.helperOkStrong}>frete grátis</ThemedText>.
          </ThemedText>
        )}

        <View style={styles.progressTrack} accessibilityLabel="Progresso para frete grátis">
          <View style={[styles.progressFill, { width: `${Math.round(freeShippingProgress * 100)}%` }]} />
        </View>

        <View style={styles.deliveryToggleRow}>
          <Pressable
            onPress={() => setDeliveryMode("delivery")}
            style={[styles.togglePill, deliveryMode === "delivery" ? styles.togglePillOn : styles.togglePillOff]}
            accessibilityRole="button"
            accessibilityLabel="Selecionar entrega em casa"
          >
            <ThemedText style={[styles.togglePillText, deliveryMode === "delivery" ? styles.togglePillTextOn : styles.togglePillTextOff]}>
              Entrega
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => setDeliveryMode("pickup")}
            style={[styles.togglePill, deliveryMode === "pickup" ? styles.togglePillOn : styles.togglePillOff]}
            accessibilityRole="button"
            accessibilityLabel="Selecionar retirada em loja"
          >
            <ThemedText style={[styles.togglePillText, deliveryMode === "pickup" ? styles.togglePillTextOn : styles.togglePillTextOff]}>
              Retirada
            </ThemedText>
          </Pressable>
        </View>

        {deliveryMode === "delivery" ? (
          <View style={styles.cepRow}>
            <TextInput
              value={cepInput}
              onChangeText={(t) => {
                setCepInput(t);
                setCepTouched(true);
              }}
              placeholder="CEP (8 dígitos)"
              placeholderTextColor="rgba(0,0,0,0.45)"
              keyboardType="number-pad"
              style={styles.cepInput}
              accessibilityLabel="Campo de CEP"
            />
            <View style={styles.shippingTag}>
              <ThemedText style={styles.shippingTagText}>
                {appliedCoupon?.code === "FRETE"
                  ? "Frete grátis (cupom)"
                  : qualifiesFreeShipping
                    ? "Frete grátis"
                    : cepOk
                      ? `Estimado: ${formatCurrency(SHIPPING_BASE)}`
                      : "Adicionar frete"}
              </ThemedText>
            </View>
          </View>
        ) : (
          <ThemedText style={styles.helperText}>Retirada gratuita (sem frete).</ThemedText>
        )}

        {deliveryMode === "delivery" && cepTouched && !cepOk ? (
          <ThemedText style={styles.helperText}>Digite um CEP válido para estimar o frete.</ThemedText>
        ) : null}
      </View>

      {/* Recomendações */}
      <View style={styles.panelCard}>
        <ThemedText style={styles.panelTitle}>Você também pode gostar</ThemedText>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recoRow}>
          {recommended.map((p) => {
            const img = toImageSource((p as any).image);
            const pid = String(p.id);
            return (
              <Pressable
                key={pid}
                onPress={() => router.push(`/product/${pid}` as any)}
                style={styles.recoCard}
                accessibilityRole="button"
                accessibilityLabel={`Abrir recomendação ${p.title}`}
              >
                <View style={styles.recoImageWrap}>
                  {img ? <Image source={img} style={styles.recoImage} resizeMode="cover" /> : <View style={styles.recoImagePlaceholder} />}
                </View>

                <ThemedText numberOfLines={2} style={styles.recoTitle}>
                  {String(p.title)}
                </ThemedText>

                <View style={styles.recoBottomRow}>
                  <ThemedText style={styles.recoPrice}>{formatCurrency(Number((p as any).price ?? 0))}</ThemedText>

                  <Pressable
                    onPress={() => safeAdd(pid)}
                    style={styles.recoAdd}
                    accessibilityRole="button"
                    accessibilityLabel={`Adicionar ${p.title} ao carrinho`}
                  >
                    <ThemedText style={styles.recoAddText}>Adicionar</ThemedText>
                  </Pressable>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Espaço extra para não colar no rodapé fixo */}
      <View style={{ height: 14 }} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Voltar">
            <ThemedText style={styles.backIcon}>←</ThemedText>
          </Pressable>

          <ThemedText style={styles.title}>Carrinho</ThemedText>

          <View style={styles.rightSpacer} />
        </View>

        <SectionList
          sections={sections}
          keyExtractor={(it) => `${it.type}-${it.id}`}
          renderItem={renderRow}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionHeaderText}>{section.title}</ThemedText>
            </View>
          )}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: hasCart ? 260 : 20 }}
          ListHeaderComponent={
            !hasCart ? (
              <View style={styles.emptyWrap}>
                <ThemedText style={styles.emptyTitle}>Seu carrinho está vazio</ThemedText>
                <ThemedText style={styles.emptyText}>Confira os produtos imperdíveis abaixo e adicione ao carrinho.</ThemedText>
                <Pressable
                  onPress={() => router.push("/(tabs)/explore" as any)}
                  style={styles.emptyBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Explorar ofertas"
                >
                  <ThemedText style={styles.emptyBtnText}>EXPLORAR OFERTAS</ThemedText>
                </Pressable>
              </View>
            ) : null
          }
          ListFooterComponent={listFooter}
        />

        {/* Rodapé fixo (somente quando tem carrinho) */}
        {hasCart ? (
          <View style={styles.footerBar}>
            {/* Resumo de custos (antes do box laranja) */}
            <View style={styles.summaryCard} accessibilityLabel="Resumo de custos">
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Subtotal</ThemedText>
                <ThemedText style={styles.summaryValue}>{formatCurrency(subtotal)}</ThemedText>
              </View>

              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Descontos</ThemedText>
                <ThemedText style={styles.summaryValue}>
                  - {formatCurrency(Math.max(0, itemDiscountTotal + couponDiscount))}
                </ThemedText>
              </View>

              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Frete</ThemedText>
                <ThemedText style={styles.summaryValue}>
                  {shipping <= 0 ? "—" : formatCurrency(shipping)}
                </ThemedText>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryTotalLabel}>Total</ThemedText>
                <ThemedText style={styles.summaryTotalValue}>{formatCurrency(total)}</ThemedText>
              </View>

              <ThemedText style={styles.trustNote}>Pagamento seguro. Dados protegidos.</ThemedText>
            </View>

            {/* Total em box laranja (regra congelada) */}
            <View style={styles.totalBox}>
              <ThemedText style={styles.totalLabel}>Total</ThemedText>
              <ThemedText style={styles.totalValue}>{formatCurrency(total)}</ThemedText>
            </View>

            {/* CTA principal (regra congelada) */}
            <Pressable
              onPress={() => router.push("/(tabs)/checkout" as any)}
              style={styles.ctaPrimary}
              accessibilityRole="button"
              accessibilityLabel="Continuar a compra"
            >
              <ThemedText style={styles.ctaPrimaryText}>Continuar a compra</ThemedText>
            </Pressable>

            {/* CTA secundário (outline) */}
            <Pressable
              onPress={() => router.push("/(tabs)/explore" as any)}
              style={styles.ctaSecondary}
              accessibilityRole="button"
              accessibilityLabel="Continuar comprando"
            >
              <ThemedText style={styles.ctaSecondaryText}>Continuar comprando</ThemedText>
            </Pressable>
          </View>
        ) : null}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 14 },

  header: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  backBtn: { width: 40, height: 40, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  backIcon: { fontSize: 22, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },

  // Carrinho (regra especial: título 24 em negrito)
  title: { fontSize: 24, fontFamily: FONT_TITLE, fontWeight: "700", textAlign: "center", color: theme.colors.text },
  rightSpacer: { width: 40, height: 40 },

  sectionHeader: { paddingTop: 10, paddingBottom: 8, backgroundColor: theme.colors.background },
  sectionHeaderText: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },

  // Card item do carrinho
  itemCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: 10,
    marginBottom: 8,
  },
  itemTop: { flexDirection: "row", gap: 10 },

  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  checkboxUnchecked: { borderColor: theme.colors.divider, backgroundColor: theme.colors.surface },
  checkboxChecked: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
  checkboxDot: { width: 8, height: 8, borderRadius: 3, backgroundColor: "#fff" },

  itemImageWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  itemImage: { width: "100%", height: "100%" },
  itemImagePlaceholder: { flex: 1, backgroundColor: theme.colors.surfaceAlt },

  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },

  priceRow: { marginTop: 6, flexDirection: "row", alignItems: "center", gap: 8 },
  price: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },
  oldPrice: { fontSize: 12, fontFamily: FONT_BODY, color: "rgba(0,0,0,0.45)", textDecorationLine: "line-through" },
  unit: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text }, // “/ un” em negrito (regra)

  qtyRow: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 10 },

  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  qtyBtnText: { fontSize: 15, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },
  qtyText: { fontSize: 12, fontFamily: FONT_BODY_BOLD, minWidth: 18, textAlign: "center", color: theme.colors.text },

  remove: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: "rgba(0,0,0,0.55)" },
  lineTotal: { marginTop: 8, fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },

  // Vazio
  emptyWrap: {
    marginTop: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: 14,
    marginBottom: 10,
  },
  emptyTitle: { fontSize: 13, fontFamily: FONT_BODY_BOLD, color: theme.colors.text, marginBottom: 6 },
  emptyText: { fontSize: 12, fontFamily: FONT_BODY, color: "rgba(0,0,0,0.65)", marginBottom: 12 },
  emptyBtn: { height: 42, borderRadius: 14, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  emptyBtnText: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: "#fff" },

  // Imperdíveis (card simples, padrão marketplace)
  dealCard: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    marginBottom: 10,
    alignItems: "center",
  },
  dealImageWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  dealImage: { width: "100%", height: "100%" },
  dealImagePlaceholder: { flex: 1, backgroundColor: theme.colors.surfaceAlt },
  dealTitle: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },
  dealPrice: { marginTop: 6, fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.primary },

  // Panels (cupom / frete / recomendações)
  panelCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: 12,
    marginBottom: 10,
  },
  panelHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  panelTitle: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },

  removeSelectedBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  removeSelectedText: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },

  couponRow: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  couponInput: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: 12,
    fontFamily: FONT_BODY,
    fontSize: 12,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  couponOk: { height: 42, paddingHorizontal: 14, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  couponOkText: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: "#fff" },

  helperText: { marginTop: 10, fontSize: 12, fontFamily: FONT_BODY, color: "rgba(0,0,0,0.65)" },
  helperStrong: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },
  helperError: { marginTop: 10, fontSize: 12, fontFamily: FONT_BODY_BOLD, color: "#B91C1C" },
  helperOk: { marginTop: 10, fontSize: 12, fontFamily: FONT_BODY, color: "rgba(0,0,0,0.75)" },
  helperOkStrong: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },

  progressTrack: {
    marginTop: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.08)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
  },

  deliveryToggleRow: { marginTop: 12, flexDirection: "row", gap: 10 },
  togglePill: { flex: 1, height: 38, borderRadius: 999, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  togglePillOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  togglePillOff: { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider },
  togglePillText: { fontSize: 12, fontFamily: FONT_BODY_BOLD },
  togglePillTextOn: { color: "#fff" },
  togglePillTextOff: { color: theme.colors.text },

  cepRow: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  cepInput: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: 12,
    fontFamily: FONT_BODY,
    fontSize: 12,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  shippingTag: {
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  shippingTagText: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },

  recoRow: { paddingTop: 10, paddingBottom: 2, gap: 10 },
  recoCard: {
    width: 180,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    padding: 10,
  },
  recoImageWrap: {
    height: 90,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  recoImage: { width: "100%", height: "100%" },
  recoImagePlaceholder: { flex: 1, backgroundColor: theme.colors.surfaceAlt },
  recoTitle: { marginTop: 10, fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },
  recoBottomRow: { marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  recoPrice: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },
  recoAdd: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: theme.colors.primary },
  recoAddText: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: "#fff" },

  // Rodapé fixo (sem TabBar no carrinho)
  footerBar: { position: "absolute", left: 14, right: 14, bottom: 10, gap: 8 },

  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 3 },
  summaryLabel: { fontSize: 12, fontFamily: FONT_BODY, color: "rgba(0,0,0,0.7)" },
  summaryValue: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },
  summaryDivider: { height: 1, backgroundColor: "rgba(0,0,0,0.08)", marginVertical: 6 },
  summaryTotalLabel: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },
  summaryTotalValue: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },
  trustNote: { marginTop: 8, fontSize: 11, fontFamily: FONT_BODY, color: "rgba(0,0,0,0.65)" },

  totalBox: {
    backgroundColor: "#F59E0B",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  totalLabel: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: "#000" }, // “Total” em negrito (regra)
  totalValue: { fontSize: 14, fontFamily: FONT_BODY_BOLD, color: "#000" },

  // Banner verde musgo (mais fino), texto 16 bold (regra)
  ctaPrimary: {
    height: 44,
    borderRadius: 14,
    backgroundColor: CTA_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaPrimaryText: { fontSize: 16, fontFamily: FONT_BODY_BOLD, color: "#FFFFFF" },

  // CTA secundário (outline neutro)
  ctaSecondary: {
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  ctaSecondaryText: { fontSize: 14, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },
});
