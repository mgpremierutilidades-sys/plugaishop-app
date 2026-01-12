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

// Frete grátis (nudge)
const FREE_SHIPPING_THRESHOLD = 249.9;

type CartRow = {
  type: "cart";
  id: string;
  title: string;
  price: number; // preço base
  qty: number;
  image?: ImageSourcePropType;
  unitLabel?: string;
  discountPercent?: number;
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

function clampPct(p: unknown) {
  const n = Number(p);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(95, n));
}

function getDiscountedUnitPrice(base: number, pct: number) {
  const p = clampPct(pct);
  if (p <= 0) return base;
  const v = base * (1 - p / 100);
  return v < 0 ? 0 : v;
}

// Cupom (mock local, sem backend)
type Coupon =
  | { code: "PLUGA10"; kind: "percent"; value: 10 }
  | { code: "PLUGA20"; kind: "percent"; value: 20 }
  | { code: "FRETE0"; kind: "freeShipping"; value: 0 };

function normalizeCoupon(raw: string): Coupon | null {
  const code = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

  if (code === "PLUGA10") return { code: "PLUGA10", kind: "percent", value: 10 };
  if (code === "PLUGA20") return { code: "PLUGA20", kind: "percent", value: 20 };
  if (code === "FRETE0") return { code: "FRETE0", kind: "freeShipping", value: 0 };
  return null;
}

// Frete (mock local por CEP)
function digitsOnly(s: string) {
  return String(s ?? "").replace(/\D+/g, "");
}

function estimateShippingByCep(cepDigits: string) {
  // mock simples e estável (não integra API)
  // regra: CEP válido (8 dígitos) -> varia por "região" (1º dígito)
  if (cepDigits.length !== 8) return 0;

  const first = Number(cepDigits[0]);
  if (!Number.isFinite(first)) return 19.9;

  if (first <= 1) return 14.9;
  if (first <= 3) return 19.9;
  if (first <= 6) return 24.9;
  return 29.9;
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
          const discountPercent = clampPct(p?.discountPercent ?? it?.discountPercent ?? 0);
          const unitLabel = String(p?.unitLabel ?? it?.unitLabel ?? "/ un");

          return {
            type: "cart",
            id: String(id),
            title,
            price: Number.isFinite(price) ? price : 0,
            qty: Math.max(1, Number.isFinite(qty) ? qty : 1),
            image,
            discountPercent,
            unitLabel,
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
        const price = Number(p?.price ?? 0);
        const discountPercent = clampPct((p as any)?.discountPercent ?? 0);
        const unitLabel = String((p as any)?.unitLabel ?? "/ un");

        return {
          type: "cart",
          id: String(id),
          title: String(p?.title ?? "Produto"),
          price: Number.isFinite(price) ? price : 0,
          qty: Math.max(1, Number.isFinite(qty) ? qty : 1),
          image: toImageSource((p as any)?.image),
          discountPercent,
          unitLabel,
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

  // ---- Remover selecionados (ação em massa) ----
  const selectedIds = useMemo(() => {
    return cartRows.filter((r) => !!selected[r.id]).map((r) => r.id);
  }, [cartRows, selected]);

  function removeSelected() {
    for (const id of selectedIds) safeRemove(id);
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

  // ---- Recomendações (carrossel horizontal) ----
  const recommended: Product[] = useMemo(() => {
    const inCart = new Set(cartRows.map((r) => String(r.id)));
    const list = (products as Product[]).filter((p) => !inCart.has(String(p.id)));
    return list.slice(0, 8);
  }, [cartRows]);

  // ---- Cupom (local/mock) ----
  const [couponInput, setCouponInput] = useState<string>("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string>("");

  function applyCoupon() {
    const c = normalizeCoupon(couponInput);
    if (!couponInput.trim()) {
      setAppliedCoupon(null);
      setCouponError("");
      return;
    }
    if (!c) {
      setAppliedCoupon(null);
      setCouponError("Cupom inválido.");
      return;
    }
    setAppliedCoupon(c);
    setCouponError("");
  }

  function clearCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
  }

  // ---- Entrega / Retirada + CEP (mock frete) ----
  const [deliveryMode, setDeliveryMode] = useState<"home" | "pickup">("home");
  const [cep, setCep] = useState<string>("");

  const cepDigits = useMemo(() => digitsOnly(cep), [cep]);

  const shippingEstimate = useMemo(() => {
    if (!hasCart) return 0;
    if (deliveryMode === "pickup") return 0;

    const base = estimateShippingByCep(cepDigits);
    // Cupom FRETE0 zera frete (apenas quando entrega em casa)
    if (appliedCoupon?.kind === "freeShipping") return 0;
    return base;
  }, [appliedCoupon?.kind, cepDigits, deliveryMode, hasCart]);

  // ---- Totais (considera apenas selecionados) ----
  const baseSubtotal = useMemo(() => {
    return cartRows.reduce((acc, r) => {
      if (!selected[r.id]) return acc;
      const p = Number(r.price);
      const q = Number(r.qty);
      if (!Number.isFinite(p) || !Number.isFinite(q)) return acc;
      return acc + p * q;
    }, 0);
  }, [cartRows, selected]);

  const itemsDiscountTotal = useMemo(() => {
    return cartRows.reduce((acc, r) => {
      if (!selected[r.id]) return acc;
      const base = Number(r.price);
      const pct = clampPct(r.discountPercent ?? 0);
      const q = Number(r.qty);
      if (!Number.isFinite(base) || !Number.isFinite(q)) return acc;

      const discounted = getDiscountedUnitPrice(base, pct);
      const d = (base - discounted) * q;
      return acc + (d > 0 ? d : 0);
    }, 0);
  }, [cartRows, selected]);

  const discountedSubtotal = useMemo(() => {
    // subtotal após desconto de item (discountPercent)
    const v = baseSubtotal - itemsDiscountTotal;
    return v < 0 ? 0 : v;
  }, [baseSubtotal, itemsDiscountTotal]);

  const couponDiscount = useMemo(() => {
    if (!appliedCoupon) return 0;

    if (appliedCoupon.kind === "percent") {
      const pct = clampPct(appliedCoupon.value);
      const d = discountedSubtotal * (pct / 100);
      return d > 0 ? d : 0;
    }

    // freeShipping não mexe no subtotal
    return 0;
  }, [appliedCoupon, discountedSubtotal]);

  const total = useMemo(() => {
    const t = discountedSubtotal - couponDiscount + shippingEstimate;
    return t < 0 ? 0 : t;
  }, [couponDiscount, discountedSubtotal, shippingEstimate]);

  // ---- Barra de frete grátis ----
  const freeShippingProgress = useMemo(() => {
    if (deliveryMode !== "home") return { pct: 1, remaining: 0 };

    const eligible = discountedSubtotal - couponDiscount; // valor que conta para frete grátis
    const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - eligible);
    const pct = FREE_SHIPPING_THRESHOLD <= 0 ? 1 : Math.min(1, eligible / FREE_SHIPPING_THRESHOLD);
    return { pct, remaining };
  }, [couponDiscount, deliveryMode, discountedSubtotal]);

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
          accessibilityLabel={`Ver produto: ${item.title}`}
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
    const pct = clampPct(item.discountPercent ?? 0);
    const unitLabel = item.unitLabel ?? "/ un";
    const unitDiscounted = getDiscountedUnitPrice(item.price, pct);
    const showPromo = pct > 0 && unitDiscounted < item.price;

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
              {showPromo ? (
                <>
                  <ThemedText style={styles.pricePromo}>{formatCurrency(unitDiscounted)}</ThemedText>
                  <ThemedText style={styles.unit}> {unitLabel}</ThemedText>

                  <ThemedText style={styles.priceStrike}>{formatCurrency(item.price)}</ThemedText>
                </>
              ) : (
                <>
                  <ThemedText style={styles.price}>{formatCurrency(item.price)}</ThemedText>
                  <ThemedText style={styles.unit}> {unitLabel}</ThemedText>
                </>
              )}
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

              <Pressable
                onPress={() => safeRemove(item.id)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Remover item"
                style={{ marginLeft: "auto" }}
              >
                <ThemedText style={styles.remove}>✕</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    );
  }

  const listTop = useMemo(() => {
    if (!hasCart) return null;

    return (
      <View style={styles.topActionsWrap}>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.topHint}>
            Selecionados: <ThemedText style={styles.topHintStrong}>{selectedIds.length}</ThemedText>
          </ThemedText>
          <ThemedText style={styles.topSubHint}>Dica: marque/desmarque para remover em massa.</ThemedText>
        </View>

        <Pressable
          onPress={removeSelected}
          disabled={selectedIds.length === 0}
          style={[styles.removeSelectedBtn, selectedIds.length === 0 ? styles.btnDisabled : null]}
          accessibilityRole="button"
          accessibilityLabel="Remover itens selecionados"
        >
          <ThemedText style={styles.removeSelectedText}>Remover selecionados</ThemedText>
        </Pressable>
      </View>
    );
  }, [hasCart, removeSelected, selectedIds.length]);

  const listFooter = useMemo(() => {
    if (!hasCart) return null;

    return (
      <View style={{ paddingTop: 6, paddingBottom: 6 }}>
        {/* Recomendações */}
        {recommended.length > 0 ? (
          <View style={styles.recoWrap}>
            <ThemedText style={styles.recoTitle}>Você também pode gostar</ThemedText>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 14 }}>
              {recommended.map((p) => {
                const img = toImageSource((p as any).image);
                return (
                  <Pressable
                    key={String(p.id)}
                    onPress={() => router.push(`/product/${String(p.id)}` as any)}
                    style={styles.recoCard}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver recomendado: ${String(p.title)}`}
                  >
                    <View style={styles.recoImageWrap}>
                      {img ? <Image source={img} style={styles.recoImage} resizeMode="cover" /> : <View style={styles.recoImagePlaceholder} />}
                    </View>
                    <ThemedText numberOfLines={2} style={styles.recoName}>
                      {String(p.title)}
                    </ThemedText>
                    <ThemedText style={styles.recoPrice}>{formatCurrency(Number((p as any).price ?? 0))}</ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* Trust badges (simples, não intrusivo) */}
        <View style={styles.trustRow}>
          <View style={styles.trustPill}>
            <ThemedText style={styles.trustText}>Pagamento seguro</ThemedText>
          </View>
          <View style={styles.trustPill}>
            <ThemedText style={styles.trustText}>Compra garantida</ThemedText>
          </View>
          <View style={styles.trustPill}>
            <ThemedText style={styles.trustText}>Suporte rápido</ThemedText>
          </View>
        </View>
      </View>
    );
  }, [hasCart, recommended]);

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
          contentContainerStyle={{ paddingBottom: hasCart ? 280 : 20 }}
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
            ) : (
              <>
                {listTop}
                {/* Barra frete grátis (nudge) */}
                {deliveryMode === "home" ? (
                  <View style={styles.nudgeCard}>
                    <ThemedText style={styles.nudgeTitle}>
                      {freeShippingProgress.remaining > 0
                        ? `Faltam ${formatCurrency(freeShippingProgress.remaining)} para frete grátis`
                        : "Você garantiu frete grátis (acima do mínimo)"}
                    </ThemedText>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${Math.round(freeShippingProgress.pct * 100)}%` }]} />
                    </View>
                    <ThemedText style={styles.nudgeSub}>Adicione mais itens e economize no envio.</ThemedText>
                  </View>
                ) : null}
              </>
            )
          }
          ListFooterComponent={listFooter}
        />

        {/* Rodapé fixo (somente quando tem carrinho) */}
        {hasCart ? (
          <View style={styles.footerBar}>
            {/* Resumo completo (transparência de custos) */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Itens</ThemedText>
                <ThemedText style={styles.summaryValue}>{formatCurrency(baseSubtotal)}</ThemedText>
              </View>

              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Descontos</ThemedText>
                <ThemedText style={styles.summaryValueMuted}>- {formatCurrency(itemsDiscountTotal)}</ThemedText>
              </View>

              {appliedCoupon?.kind === "percent" ? (
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>Cupom ({appliedCoupon.code})</ThemedText>
                  <ThemedText style={styles.summaryValueMuted}>- {formatCurrency(couponDiscount)}</ThemedText>
                </View>
              ) : null}

              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Frete estimado</ThemedText>
                <ThemedText style={styles.summaryValue}>{shippingEstimate > 0 ? formatCurrency(shippingEstimate) : "—"}</ThemedText>
              </View>

              {/* Cupom */}
              <View style={{ marginTop: 10 }}>
                <ThemedText style={styles.inlineLabel}>Aplicar cupom</ThemedText>
                <View style={styles.inlineRow}>
                  <TextInput
                    value={couponInput}
                    onChangeText={(t) => {
                      setCouponInput(t);
                      if (couponError) setCouponError("");
                    }}
                    placeholder="Digite o cupom"
                    placeholderTextColor="rgba(0,0,0,0.45)"
                    autoCapitalize="characters"
                    style={styles.input}
                    accessibilityLabel="Campo de cupom"
                  />
                  {appliedCoupon ? (
                    <Pressable onPress={clearCoupon} style={styles.inlineBtnOutline} accessibilityRole="button" accessibilityLabel="Remover cupom">
                      <ThemedText style={styles.inlineBtnOutlineText}>Limpar</ThemedText>
                    </Pressable>
                  ) : (
                    <Pressable onPress={applyCoupon} style={styles.inlineBtn} accessibilityRole="button" accessibilityLabel="Aplicar cupom">
                      <ThemedText style={styles.inlineBtnText}>OK</ThemedText>
                    </Pressable>
                  )}
                </View>
                {couponError ? <ThemedText style={styles.errorText}>{couponError}</ThemedText> : null}
              </View>

              {/* Entrega / Retirada */}
              <View style={{ marginTop: 12 }}>
                <ThemedText style={styles.inlineLabel}>Entrega</ThemedText>
                <View style={styles.segmentWrap}>
                  <Pressable
                    onPress={() => setDeliveryMode("home")}
                    style={[styles.segmentBtn, deliveryMode === "home" ? styles.segmentOn : styles.segmentOff]}
                    accessibilityRole="button"
                    accessibilityLabel="Selecionar entrega em casa"
                  >
                    <ThemedText style={[styles.segmentText, deliveryMode === "home" ? styles.segmentTextOn : styles.segmentTextOff]}>
                      Em casa
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => setDeliveryMode("pickup")}
                    style={[styles.segmentBtn, deliveryMode === "pickup" ? styles.segmentOn : styles.segmentOff]}
                    accessibilityRole="button"
                    accessibilityLabel="Selecionar retirada em loja"
                  >
                    <ThemedText style={[styles.segmentText, deliveryMode === "pickup" ? styles.segmentTextOn : styles.segmentTextOff]}>
                      Retirada
                    </ThemedText>
                  </Pressable>
                </View>

                {deliveryMode === "home" ? (
                  <View style={{ marginTop: 10 }}>
                    <ThemedText style={styles.inlineLabel}>CEP para estimar frete</ThemedText>
                    <View style={styles.inlineRow}>
                      <TextInput
                        value={cep}
                        onChangeText={setCep}
                        placeholder="00000-000"
                        placeholderTextColor="rgba(0,0,0,0.45)"
                        keyboardType="number-pad"
                        style={styles.input}
                        accessibilityLabel="Campo de CEP"
                      />
                      <View style={styles.inlineBtnGhost}>
                        <ThemedText style={styles.inlineBtnGhostText}>{cepDigits.length === 8 ? "OK" : "—"}</ThemedText>
                      </View>
                    </View>
                    <ThemedText style={styles.helperText}>Frete é uma estimativa (mock) até integrar com transportadoras.</ThemedText>
                  </View>
                ) : (
                  <ThemedText style={styles.helperText}>Retirada em loja: frete grátis.</ThemedText>
                )}
              </View>
            </View>

            {/* Total (regra congelada) */}
            <View style={styles.totalBox}>
              <ThemedText style={styles.totalLabel}>Total</ThemedText>
              <ThemedText style={styles.totalValue}>{formatCurrency(total)}</ThemedText>
            </View>

            {/* CTA principal (regra congelada: verde musgo, mais fino, 16 bold) */}
            <Pressable
              onPress={() => router.push("/(tabs)/checkout" as any)}
              style={styles.ctaPrimary}
              accessibilityRole="button"
              accessibilityLabel="Prosseguir para checkout"
            >
              <ThemedText style={styles.ctaPrimaryText}>Continuar a compra</ThemedText>
            </Pressable>

            {/* CTA secundário (outline, separado e contrastante) */}
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

  // Ações (remover selecionados)
  topActionsWrap: {
    marginTop: 8,
    marginBottom: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  topHint: { fontSize: 12, fontFamily: FONT_BODY, color: theme.colors.text },
  topHintStrong: { fontFamily: FONT_BODY_BOLD },
  topSubHint: { marginTop: 4, fontSize: 12, fontFamily: FONT_BODY, color: "rgba(0,0,0,0.60)" },
  removeSelectedBtn: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  removeSelectedText: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },
  btnDisabled: { opacity: 0.45 },

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

  priceRow: { marginTop: 6, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  price: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },
  unit: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text }, // “/ un” em negrito (regra)

  pricePromo: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.primary },
  priceStrike: {
    fontSize: 12,
    fontFamily: FONT_BODY,
    color: "rgba(0,0,0,0.55)",
    textDecorationLine: "line-through",
  },

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

  // Nudge: frete grátis
  nudgeCard: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  nudgeTitle: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },
  nudgeSub: { marginTop: 6, fontSize: 12, fontFamily: FONT_BODY, color: "rgba(0,0,0,0.60)" },
  progressTrack: {
    marginTop: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  progressFill: { height: "100%", backgroundColor: theme.colors.primary },

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

  // Recomendações
  recoWrap: {
    marginTop: 6,
    marginBottom: 10,
  },
  recoTitle: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text, marginBottom: 10 },
  recoCard: {
    width: 140,
    marginRight: 10,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  recoImageWrap: {
    width: "100%",
    height: 90,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surfaceAlt,
    marginBottom: 8,
  },
  recoImage: { width: "100%", height: "100%" },
  recoImagePlaceholder: { flex: 1, backgroundColor: theme.colors.surfaceAlt },
  recoName: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },
  recoPrice: { marginTop: 6, fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.primary },

  // Trust badges
  trustRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 10 },
  trustPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  trustText: { fontSize: 12, fontFamily: FONT_BODY, color: "rgba(0,0,0,0.70)" },

  // Rodapé fixo (sem TabBar no carrinho)
  footerBar: { position: "absolute", left: 14, right: 14, bottom: 10, gap: 8 },

  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: 12,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 2 },
  summaryLabel: { fontSize: 12, fontFamily: FONT_BODY, color: "rgba(0,0,0,0.75)" },
  summaryValue: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },
  summaryValueMuted: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: "rgba(0,0,0,0.65)" },

  inlineLabel: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text, marginBottom: 6 },
  inlineRow: { flexDirection: "row", alignItems: "center", gap: 8 },

  input: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 12,
    fontFamily: FONT_BODY,
    fontSize: 12,
    color: theme.colors.text,
  },
  inlineBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineBtnText: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: "#fff" },
  inlineBtnOutline: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineBtnOutlineText: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },
  inlineBtnGhost: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineBtnGhostText: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: "rgba(0,0,0,0.60)" },

  errorText: { marginTop: 6, fontSize: 12, fontFamily: FONT_BODY, color: "#B91C1C" },
  helperText: { marginTop: 6, fontSize: 12, fontFamily: FONT_BODY, color: "rgba(0,0,0,0.60)" },

  segmentWrap: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: theme.colors.surface,
  },
  segmentBtn: { flex: 1, height: 40, alignItems: "center", justifyContent: "center" },
  segmentOn: { backgroundColor: theme.colors.primary },
  segmentOff: { backgroundColor: theme.colors.surface },
  segmentText: { fontSize: 12, fontFamily: FONT_BODY_BOLD },
  segmentTextOn: { color: "#fff" },
  segmentTextOff: { color: theme.colors.text },

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

  // CTA secundário (outline, neutro)
  ctaSecondary: {
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaSecondaryText: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },
});
