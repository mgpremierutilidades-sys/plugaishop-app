// app/(tabs)/cart.tsx
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  SectionList,
  StyleSheet,
  TextInput,
  Vibration,
  View,
  type ImageSourcePropType,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import Icon from "../../components/ui/icon-symbol";
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
// - CTA verde musgo “Continuar a compra” (mais fino), texto 16 bold
// Ajuste Etapa 17: mantém “musgo”, mas com mais contraste/legibilidade.
const CTA_GREEN = "#2F5D3A"; // mais profundo (melhor contraste), ainda “musgo”

// Frete grátis (mock/UX nudge)
const FREE_SHIPPING_THRESHOLD = 199.9;

// Cupom mock
type Coupon =
  | { code: string; type: "percent"; value: number; label: string }
  | { code: string; type: "fixed"; value: number; label: string }
  | { code: string; type: "free_shipping"; value: 0; label: string };

const COUPONS: Coupon[] = [
  { code: "PLUGA10", type: "percent", value: 10, label: "10% OFF" },
  { code: "PLUGA20", type: "percent", value: 20, label: "20% OFF" },
  { code: "MENOS15", type: "fixed", value: 15, label: "R$ 15 OFF" },
  { code: "FRETE", type: "free_shipping", value: 0, label: "FRETE GRÁTIS" },
];

type ShippingMethod = "delivery" | "pickup";

type CartRow = {
  type: "cart";
  id: string;
  title: string;
  price: number;
  qty: number;
  image?: ImageSourcePropType;
  discountPercent?: number;
  unitLabel?: string;
};

type DealRow = {
  type: "deal";
  id: string;
  title: string;
  price: number;
  image?: ImageSourcePropType;
  discountPercent?: number;
};

type SummaryRow = { type: "summary"; id: "summary" };
type RecoRow = { type: "reco"; id: "reco" };
type SavedRow = { type: "saved"; id: "saved" };

type Row = CartRow | DealRow | SummaryRow | RecoRow | SavedRow;

type CartSection = {
  title: string;
  data: Row[];
};

type SavedItem = {
  id: string;
  title: string;
  price: number;
  qty: number;
  image?: ImageSourcePropType;
  discountPercent?: number;
  unitLabel?: string;
};

// Proteção (upsell estilo Magalu)
type ProtectionPlan = {
  months: number;
  price: number;
  installments: number; // só UX
  recommended?: boolean;
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

function clampMoney(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

function normalizeCep(raw: string) {
  return String(raw ?? "").replace(/\D+/g, "").slice(0, 8);
}

function estimateShipping(cep8: string): number {
  if (!cep8 || cep8.length !== 8) return 0;

  const prefix2 = cep8.slice(0, 2);
  const p2 = Number(prefix2);

  if (prefix2 === "74" || prefix2 === "75") return 9.9;
  if (p2 >= 1 && p2 <= 19) return 14.9;
  if (p2 >= 20 && p2 <= 39) return 19.9;
  return 24.9;
}

function calcUnitWithProductDiscount(unit: number, discountPercent?: number) {
  const pct = Number(discountPercent ?? 0);
  if (!Number.isFinite(pct) || pct <= 0) return unit;
  const discounted = unit * (1 - pct / 100);
  return clampMoney(discounted);
}

function roundToCents(n: number) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// Precificação simples de proteção (UX)
function buildProtectionPlans(unitFinal: number): ProtectionPlan[] {
  const u = clampMoney(unitFinal);

  const p12 = roundToCents(Math.min(Math.max(u * 0.13, 9.9), 399));
  const p24 = roundToCents(Math.min(Math.max(u * 0.18, 14.9), 549));

  return [
    { months: 12, price: p12, installments: 10, recommended: true },
    { months: 24, price: p24, installments: 12 },
  ];
}

// microfeedback nativo (sem dependência extra)
function softHaptic() {
  try {
    Vibration.vibrate(8);
  } catch {
    // noop
  }
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

          const catalogP = findProductById(String(id));
          const price = Number(p?.price ?? it?.price ?? catalogP?.price ?? 0);
          const title = String(p?.title ?? it?.title ?? catalogP?.title ?? "Produto");
          const image = toImageSource(p?.image ?? it?.image ?? catalogP?.image);

          return {
            type: "cart",
            id: String(id),
            title,
            price,
            qty: Math.max(1, Number.isFinite(qty) ? qty : 1),
            image,
            discountPercent: Number(p?.discountPercent ?? catalogP?.discountPercent ?? 0) || undefined,
            unitLabel: String(p?.unitLabel ?? catalogP?.unitLabel ?? "/ un"),
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
          discountPercent: Number((p as any)?.discountPercent ?? 0) || undefined,
          unitLabel: String((p as any)?.unitLabel ?? "/ un"),
        } as CartRow;
      });
      return mapped;
    }

    return [];
  }, [cartCtx]);

  const hasCart = cartRows.length > 0;

  // Seleção (checkbox)
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const r of cartRows) next[r.id] = true;
    setSelected(next);
  }, [cartRows]);

  const toggleSelect = useCallback((id: string) => {
    softHaptic();
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const selectAll = useCallback(() => {
    softHaptic();
    setSelected((prev) => {
      const next: Record<string, boolean> = { ...prev };
      for (const r of cartRows) next[r.id] = true;
      return next;
    });
  }, [cartRows]);

  const anySelected = useMemo(() => {
    for (const r of cartRows) {
      if (selected[r.id]) return true;
    }
    return false;
  }, [cartRows, selected]);

  const selectedCount = useMemo(() => {
    let c = 0;
    for (const r of cartRows) if (selected[r.id]) c += 1;
    return c;
  }, [cartRows, selected]);

  // Ações seguras (compat com CartContext)
  const safeAdd = useCallback(
    (productId: string, qtyDelta: number = 1) => {
      const p = findProductById(productId);
      if (!p) return;

      const any = cartCtx as any;
      const fn =
        any?.addItem?.bind(any) ||
        any?.add?.bind(any) ||
        any?.addToCart?.bind(any) ||
        any?.increase?.bind(any) ||
        any?.increment?.bind(any);

      if (fn) fn(p, qtyDelta);
    },
    [cartCtx]
  );

  const safeDec = useCallback(
    (productId: string, qtyDelta: number = 1) => {
      const p = findProductById(productId);
      if (!p) return;

      const any = cartCtx as any;
      const fn =
        any?.decItem?.bind(any) ||
        any?.decrease?.bind(any) ||
        any?.dec?.bind(any) ||
        any?.decrement?.bind(any) ||
        any?.removeOne?.bind(any);

      if (fn) fn(p, qtyDelta);
    },
    [cartCtx]
  );

  const safeRemove = useCallback(
    (productId: string) => {
      const any = cartCtx as any;
      const fn =
        any?.removeItem?.bind(any) ||
        any?.remove?.bind(any) ||
        any?.removeFromCart?.bind(any) ||
        any?.deleteItem?.bind(any) ||
        any?.clearItem?.bind(any);

      if (fn) fn(productId);
    },
    [cartCtx]
  );

  const removeSelected = useCallback(() => {
    softHaptic();
    for (const r of cartRows) {
      if (selected[r.id]) safeRemove(r.id);
    }
  }, [cartRows, selected, safeRemove]);

  // Salvar para depois (local, sem persistir por enquanto)
  const [saved, setSaved] = useState<SavedItem[]>([]);

  const saveForLater = useCallback(
    (row: CartRow) => {
      softHaptic();
      setSaved((prev) => {
        const idx = prev.findIndex((p) => p.id === row.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], qty: copy[idx].qty + row.qty };
          return copy;
        }
        return [
          ...prev,
          {
            id: row.id,
            title: row.title,
            price: row.price,
            qty: row.qty,
            image: row.image,
            discountPercent: row.discountPercent,
            unitLabel: row.unitLabel,
          },
        ];
      });
      safeRemove(row.id);
    },
    [safeRemove]
  );

  const moveSavedToCart = useCallback(
    (it: SavedItem) => {
      softHaptic();
      safeAdd(it.id, Math.max(1, it.qty));
      setSaved((prev) => prev.filter((p) => p.id !== it.id));
    },
    [safeAdd]
  );

  const removeSaved = useCallback((id: string) => {
    softHaptic();
    setSaved((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Produtos imperdíveis (garante scroll)
  const dealRows: DealRow[] = useMemo(() => {
    const list = (products as Product[]).slice(0, 14);
    return list.map((p) => ({
      type: "deal",
      id: String(p.id),
      title: String(p.title),
      price: Number(p.price ?? 0),
      image: toImageSource((p as any).image),
      discountPercent: Number((p as any)?.discountPercent ?? 0) || undefined,
    }));
  }, []);

  // Recomendações (carrossel)
  const recommended: Product[] = useMemo(() => {
    const inCart = new Set(cartRows.map((r) => String(r.id)));
    const pool = (products as Product[]).filter((p) => !inCart.has(String(p.id)));
    return pool.slice(0, 8);
  }, [cartRows]);

  // Cupom
  const [couponInput, setCouponInput] = useState<string>("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponMsg, setCouponMsg] = useState<string>("");

  const applyCouponCode = useCallback((codeRaw: string) => {
    softHaptic();
    const code = String(codeRaw ?? "")
      .trim()
      .toUpperCase();

    if (!code) {
      setCouponMsg("Digite um cupom.");
      return;
    }

    const found = COUPONS.find((c) => c.code === code) ?? null;
    if (!found) {
      setAppliedCoupon(null);
      setCouponMsg("Cupom inválido.");
      return;
    }

    setAppliedCoupon(found);
    setCouponMsg(`Cupom aplicado: ${found.code} (${found.label})`);
  }, []);

  const applyCoupon = useCallback(() => applyCouponCode(couponInput), [applyCouponCode, couponInput]);

  const clearCoupon = useCallback(() => {
    softHaptic();
    setAppliedCoupon(null);
    setCouponMsg("");
    setCouponInput("");
  }, []);

  // Entrega / Retirada + CEP
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("delivery");
  const [cepInput, setCepInput] = useState<string>("");

  const cep8 = useMemo(() => normalizeCep(cepInput), [cepInput]);

  // === Proteção (local) ===
  const [protectionById, setProtectionById] = useState<Record<string, number | undefined>>({});
  const [protectionModalFor, setProtectionModalFor] = useState<{ id: string; unitFinal: number } | null>(null);

  useEffect(() => {
    setProtectionById((prev) => {
      const ids = new Set(cartRows.map((r) => r.id));
      const next: Record<string, number | undefined> = {};
      for (const k of Object.keys(prev)) {
        if (ids.has(k)) next[k] = prev[k];
      }
      return next;
    });
  }, [cartRows]);

  const openProtectionModal = useCallback((id: string, unitFinal: number) => {
    softHaptic();
    setProtectionModalFor({ id, unitFinal });
  }, []);

  const removeProtection = useCallback((id: string) => {
    softHaptic();
    setProtectionById((prev) => ({ ...prev, [id]: undefined }));
  }, []);

  const chooseProtection = useCallback((id: string, months: number) => {
    softHaptic();
    setProtectionById((prev) => ({ ...prev, [id]: months }));
  }, []);

  // Totais (apenas selecionados)
  const subtotalRaw = useMemo(() => {
    return cartRows.reduce((acc, r) => {
      if (!selected[r.id]) return acc;
      return acc + r.price * r.qty;
    }, 0);
  }, [cartRows, selected]);

  const productDiscountTotal = useMemo(() => {
    return cartRows.reduce((acc, r) => {
      if (!selected[r.id]) return acc;
      const pct = Number(r.discountPercent ?? 0);
      if (!Number.isFinite(pct) || pct <= 0) return acc;
      const dUnit = (r.price * pct) / 100;
      return acc + dUnit * r.qty;
    }, 0);
  }, [cartRows, selected]);

  const subtotalAfterProductDiscount = useMemo(() => {
    return clampMoney(subtotalRaw - productDiscountTotal);
  }, [subtotalRaw, productDiscountTotal]);

  const couponDiscount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.type === "free_shipping") return 0;

    if (appliedCoupon.type === "percent") {
      const pct = Number(appliedCoupon.value ?? 0);
      if (!Number.isFinite(pct) || pct <= 0) return 0;
      return clampMoney((subtotalAfterProductDiscount * pct) / 100);
    }

    if (appliedCoupon.type === "fixed") {
      const v = Number(appliedCoupon.value ?? 0);
      if (!Number.isFinite(v) || v <= 0) return 0;
      return clampMoney(v);
    }

    return 0;
  }, [appliedCoupon, subtotalAfterProductDiscount]);

  const discountTotal = useMemo(
    () => clampMoney(productDiscountTotal + couponDiscount),
    [productDiscountTotal, couponDiscount]
  );

  const protectionTotal = useMemo(() => {
    return cartRows.reduce((acc, r) => {
      if (!selected[r.id]) return acc;

      const months = protectionById[r.id];
      if (!months) return acc;

      const unit = Number(r.price ?? 0);
      const unitFinal = calcUnitWithProductDiscount(unit, r.discountPercent);
      const plans = buildProtectionPlans(unitFinal);
      const plan = plans.find((p) => p.months === months) ?? null;
      if (!plan) return acc;

      return acc + plan.price;
    }, 0);
  }, [cartRows, protectionById, selected]);

  const shippingEstimated = useMemo(() => {
    if (!hasCart) return 0;
    if (shippingMethod === "pickup") return 0;
    if (appliedCoupon?.type === "free_shipping") return 0;

    if (subtotalAfterProductDiscount >= FREE_SHIPPING_THRESHOLD) return 0;

    return estimateShipping(cep8);
  }, [appliedCoupon, cep8, hasCart, shippingMethod, subtotalAfterProductDiscount]);

  const total = useMemo(() => {
    const t = subtotalAfterProductDiscount - couponDiscount + shippingEstimated + protectionTotal;
    return t < 0 ? 0 : t;
  }, [couponDiscount, shippingEstimated, subtotalAfterProductDiscount, protectionTotal]);

  const freeShippingProgress = useMemo(() => {
    const v = subtotalAfterProductDiscount;
    const ratio = FREE_SHIPPING_THRESHOLD <= 0 ? 0 : Math.min(1, v / FREE_SHIPPING_THRESHOLD);
    const missing = clampMoney(FREE_SHIPPING_THRESHOLD - v);
    return { ratio, missing, reached: v >= FREE_SHIPPING_THRESHOLD };
  }, [subtotalAfterProductDiscount]);

  // Seções
  const sections: CartSection[] = useMemo(() => {
    const s: CartSection[] = [];

    s.push({ title: "Produtos", data: cartRows as Row[] });

    if (saved.length > 0) s.push({ title: "SALVOS PARA DEPOIS", data: [{ type: "saved", id: "saved" }] });

    if (hasCart) s.push({ title: "Resumo do pedido", data: [{ type: "summary", id: "summary" }] });

    if (hasCart) s.push({ title: "Você também pode gostar", data: [{ type: "reco", id: "reco" }] });

    s.push({ title: "PRODUTOS IMPERDÍVEIS", data: dealRows as Row[] });

    return s;
  }, [cartRows, dealRows, hasCart, saved.length]);

  const headerContent = useMemo(() => {
    if (!hasCart) {
      return (
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
      );
    }

    // Etapa 17: só faz sentido exibir ferramentas quando houver múltiplos itens
    if (cartRows.length < 2) return <View style={{ height: 6 }} />;

    return (
      <View style={styles.toolsBar}>
        <Pressable onPress={selectAll} style={styles.toolsBtn} accessibilityRole="button" accessibilityLabel="Selecionar todos">
          <ThemedText style={styles.toolsBtnText}>Selecionar tudo</ThemedText>
        </Pressable>

        <Pressable
          onPress={removeSelected}
          disabled={!anySelected}
          style={[styles.toolsBtnDanger, !anySelected ? styles.toolsBtnDisabled : null]}
          accessibilityRole="button"
          accessibilityLabel="Remover selecionados"
        >
          <ThemedText style={styles.toolsBtnDangerText}>Remover selecionados</ThemedText>
        </Pressable>
      </View>
    );
  }, [anySelected, hasCart, cartRows.length, removeSelected, selectAll]);

  const renderDeal = useCallback(({ item }: { item: DealRow }) => {
    const unit = item.price;
    const unitFinal = calcUnitWithProductDiscount(unit, item.discountPercent);
    const hasPromo = unitFinal !== unit;

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

          <View style={styles.priceLine}>
            {hasPromo ? <ThemedText style={styles.priceStriked}>{formatCurrency(unit)}</ThemedText> : null}
            <ThemedText style={styles.dealPrice}>{formatCurrency(unitFinal)}</ThemedText>
          </View>
        </View>
      </Pressable>
    );
  }, []);

  const renderCartItem = useCallback(
    ({ item }: { item: CartRow }) => {
      const isChecked = !!selected[item.id];

      const unit = Number(item.price ?? 0);
      const unitFinal = calcUnitWithProductDiscount(unit, item.discountPercent);
      const hasPromo = unitFinal !== unit;
      const lineTotal = unitFinal * item.qty;

      const fomo = Number(item.discountPercent ?? 0) >= 15;

      const plans = buildProtectionPlans(unitFinal);
      const chosenMonths = protectionById[item.id];
      const chosenPlan = chosenMonths ? plans.find((p) => p.months === chosenMonths) ?? null : null;

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
              {item.image ? <Image source={item.image} style={styles.itemImage} resizeMode="cover" /> : <View style={styles.itemImagePlaceholder} />}
            </View>

            <View style={styles.itemInfo}>
              <ThemedText numberOfLines={2} style={styles.itemTitle}>
                {item.title}
              </ThemedText>

              {fomo ? <ThemedText style={styles.fomo}>Poucas unidades em estoque</ThemedText> : null}

              <View style={styles.priceRow}>
                {hasPromo ? <ThemedText style={styles.priceStriked}>{formatCurrency(unit)}</ThemedText> : null}
                <ThemedText style={styles.price}>{formatCurrency(unitFinal)}</ThemedText>
                {/* Etapa 17: unit label mais discreto */}
                <ThemedText style={styles.unit}> {item.unitLabel ?? "/ un"}</ThemedText>
              </View>

              <View style={styles.qtyRow}>
                <Pressable
                  onPress={() => {
                    softHaptic();
                    safeDec(item.id);
                  }}
                  style={styles.qtyBtn}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Diminuir quantidade"
                >
                  <Icon name="remove-outline" size={18} color={theme.colors.text} />
                </Pressable>

                <ThemedText style={styles.qtyText}>{item.qty}</ThemedText>

                <Pressable
                  onPress={() => {
                    softHaptic();
                    safeAdd(item.id);
                  }}
                  style={styles.qtyBtn}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Aumentar quantidade"
                >
                  <Icon name="add-outline" size={18} color={theme.colors.text} />
                </Pressable>

                <View style={{ marginLeft: "auto", alignItems: "flex-end" }}>
                  {/* Etapa 17: total do item mais evidente */}
                  <ThemedText style={styles.lineTotal}>{formatCurrency(lineTotal)}</ThemedText>

                  <View style={styles.itemActionsRow}>
                    <Pressable
                      onPress={() => saveForLater(item)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel="Salvar para depois"
                      style={styles.actionPill}
                    >
                      <ThemedText style={styles.actionPillText}>Salvar</ThemedText>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        softHaptic();
                        safeRemove(item.id);
                      }}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel="Remover item"
                      style={styles.actionPillDanger}
                    >
                      <ThemedText style={styles.actionPillDangerText}>Remover</ThemedText>
                    </Pressable>
                  </View>
                </View>
              </View>

              <Pressable
                onPress={() => openProtectionModal(item.id, unitFinal)}
                style={styles.protectionRow}
                accessibilityRole="button"
                accessibilityLabel="Incluir proteção"
              >
                <View style={[styles.protectionCheck, chosenPlan ? styles.protectionCheckOn : styles.protectionCheckOff]}>
                  {chosenPlan ? <View style={styles.protectionDot} /> : null}
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <ThemedText style={styles.protectionTitle}>
                      {chosenPlan ? `Garantia Estendida ${chosenPlan.months} meses` : "Garantia Estendida"}
                    </ThemedText>
                    <View style={styles.badgeRec}>
                      <ThemedText style={styles.badgeRecText}>Recomendado</ThemedText>
                    </View>
                  </View>

                  {chosenPlan ? (
                    <ThemedText style={styles.protectionSub}>
                      {chosenPlan.installments}x de {formatCurrency(chosenPlan.price / chosenPlan.installments)} sem juros • ou {formatCurrency(chosenPlan.price)} no Pix
                    </ThemedText>
                  ) : (
                    <ThemedText style={styles.protectionSub}>Toque para incluir proteção no seu pedido.</ThemedText>
                  )}
                </View>

                {chosenPlan ? (
                  <Pressable
                    onPress={() => removeProtection(item.id)}
                    hitSlop={10}
                    style={styles.protectionRemove}
                    accessibilityRole="button"
                    accessibilityLabel="Remover proteção"
                  >
                    <ThemedText style={styles.protectionRemoveText}>Remover</ThemedText>
                  </Pressable>
                ) : null}
              </Pressable>
            </View>
          </View>
        </View>
      );
    },
    [openProtectionModal, protectionById, removeProtection, safeAdd, safeDec, safeRemove, saveForLater, selected, toggleSelect]
  );

  const renderSavedRow = useCallback(() => {
    return (
      <View style={styles.savedWrap}>
        {saved.map((it) => {
          const unitFinal = calcUnitWithProductDiscount(it.price, it.discountPercent);
          return (
            <View key={it.id} style={styles.savedCard}>
              <View style={styles.savedLeft}>
                <View style={styles.savedImageWrap}>
                  {it.image ? <Image source={it.image} style={styles.savedImage} resizeMode="cover" /> : <View style={styles.savedImagePh} />}
                </View>

                <View style={{ flex: 1 }}>
                  <ThemedText numberOfLines={2} style={styles.savedTitle}>
                    {it.title}
                  </ThemedText>
                  <ThemedText style={styles.savedMeta}>
                    {formatCurrency(unitFinal)} • {it.qty} {it.unitLabel ?? "/ un"}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.savedRight}>
                <Pressable onPress={() => moveSavedToCart(it)} style={styles.savedBtn} accessibilityRole="button" accessibilityLabel="Mover para o carrinho">
                  <ThemedText style={styles.savedBtnText}>Mover</ThemedText>
                </Pressable>

                <Pressable onPress={() => removeSaved(it.id)} style={styles.savedBtnOutline} accessibilityRole="button" accessibilityLabel="Remover dos salvos">
                  <ThemedText style={styles.savedBtnOutlineText}>Excluir</ThemedText>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
    );
  }, [moveSavedToCart, removeSaved, saved]);

  const renderSummaryRow = useCallback(() => {
    if (!hasCart) return null;

    return (
      <View style={styles.blockStack}>
        <View style={styles.blockCard}>
          <ThemedText style={styles.blockTitle}>Frete grátis</ThemedText>

          {appliedCoupon?.type === "free_shipping" ? (
            <ThemedText style={styles.blockText}>Cupom de frete grátis aplicado.</ThemedText>
          ) : freeShippingProgress.reached ? (
            <ThemedText style={styles.blockText}>Você ganhou frete grátis.</ThemedText>
          ) : (
            <ThemedText style={styles.blockText}>
              Faltam <ThemedText style={styles.blockTextBold}>{formatCurrency(freeShippingProgress.missing)}</ThemedText> para frete grátis.
            </ThemedText>
          )}

          <View style={styles.progressTrack} accessibilityLabel="Progresso para frete grátis">
            <View style={[styles.progressFill, { width: `${Math.round(freeShippingProgress.ratio * 100)}%` }]} />
          </View>
        </View>

        <View style={styles.blockCard}>
          <View style={styles.blockTopRow}>
            <ThemedText style={styles.blockTitle}>Aplicar cupom</ThemedText>
            {appliedCoupon ? (
              <Pressable onPress={clearCoupon} accessibilityRole="button" accessibilityLabel="Remover cupom">
                <ThemedText style={styles.linkDanger}>Remover</ThemedText>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.couponRow}>
            <TextInput
              value={couponInput}
              onChangeText={setCouponInput}
              placeholder="Digite o cupom"
              placeholderTextColor={"rgba(0,0,0,0.45)"}
              autoCapitalize="characters"
              style={styles.input}
              accessibilityLabel="Campo de cupom"
              returnKeyType="done"
              onSubmitEditing={applyCoupon}
            />
            <Pressable onPress={applyCoupon} style={styles.primaryMiniBtn} accessibilityRole="button" accessibilityLabel="Aplicar cupom">
              <ThemedText style={styles.primaryMiniBtnText}>OK</ThemedText>
            </Pressable>
          </View>

          <View style={styles.chipsRow}>
            {COUPONS.map((c) => (
              <Pressable
                key={c.code}
                onPress={() => {
                  setCouponInput(c.code);
                  applyCouponCode(c.code);
                }}
                style={styles.chip}
                accessibilityRole="button"
                accessibilityLabel={`Aplicar cupom ${c.code}`}
              >
                <ThemedText style={styles.chipText}>{c.code}</ThemedText>
              </Pressable>
            ))}
          </View>

          {couponMsg ? <ThemedText style={styles.hintText}>{couponMsg}</ThemedText> : null}
        </View>

        <View style={styles.blockCard}>
          <ThemedText style={styles.blockTitle}>Entrega</ThemedText>

          <View style={styles.segment}>
            <Pressable
              onPress={() => {
                softHaptic();
                setShippingMethod("delivery");
              }}
              style={[styles.segmentBtn, shippingMethod === "delivery" ? styles.segmentBtnOn : null]}
              accessibilityRole="button"
              accessibilityLabel="Selecionar entrega em casa"
            >
              <ThemedText style={[styles.segmentText, shippingMethod === "delivery" ? styles.segmentTextOn : null]}>Entrega</ThemedText>
            </Pressable>

            <Pressable
              onPress={() => {
                softHaptic();
                setShippingMethod("pickup");
              }}
              style={[styles.segmentBtn, shippingMethod === "pickup" ? styles.segmentBtnOn : null]}
              accessibilityRole="button"
              accessibilityLabel="Selecionar retirada em loja"
            >
              <ThemedText style={[styles.segmentText, shippingMethod === "pickup" ? styles.segmentTextOn : null]}>Retirada</ThemedText>
            </Pressable>
          </View>

          {shippingMethod === "delivery" ? (
            <View style={{ marginTop: 10 }}>
              <TextInput
                value={cepInput}
                onChangeText={(t) => setCepInput(normalizeCep(t))}
                placeholder="CEP (somente números)"
                placeholderTextColor={"rgba(0,0,0,0.45)"}
                keyboardType="numeric"
                style={styles.input}
                maxLength={8}
                accessibilityLabel="Campo de CEP"
              />
              <ThemedText style={styles.hintText}>
                {cep8.length === 8 ? `Frete estimado: ${formatCurrency(shippingEstimated)}` : "Digite seu CEP para estimar o frete."}
              </ThemedText>
            </View>
          ) : (
            <ThemedText style={styles.hintText}>Retirada em loja: frete grátis.</ThemedText>
          )}
        </View>

        <View style={styles.blockCard}>
          <ThemedText style={styles.blockTitle}>Resumo</ThemedText>

          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Subtotal</ThemedText>
            <ThemedText style={styles.summaryValue}>{formatCurrency(subtotalRaw)}</ThemedText>
          </View>

          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Descontos</ThemedText>
            <ThemedText style={styles.summaryValue}>- {formatCurrency(discountTotal)}</ThemedText>
          </View>

          {protectionTotal > 0 ? (
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Proteção</ThemedText>
              <ThemedText style={styles.summaryValue}>{formatCurrency(protectionTotal)}</ThemedText>
            </View>
          ) : null}

          <View style={[styles.summaryRow, { marginBottom: 0 }]}>
            <ThemedText style={styles.summaryLabel}>Frete</ThemedText>
            <ThemedText style={styles.summaryValue}>{formatCurrency(shippingEstimated)}</ThemedText>
          </View>

          <Pressable onPress={() => router.push("/(tabs)/explore" as any)} style={styles.outlineBtn} accessibilityRole="button" accessibilityLabel="Continuar comprando">
            <ThemedText style={styles.outlineBtnText}>Continuar comprando</ThemedText>
          </Pressable>

          <View style={styles.trustRow}>
            <ThemedText style={styles.trustText}>Pagamento seguro • Suporte rápido • Compra protegida</ThemedText>
          </View>
        </View>
      </View>
    );
  }, [
    applyCoupon,
    applyCouponCode,
    appliedCoupon,
    clearCoupon,
    couponInput,
    couponMsg,
    discountTotal,
    freeShippingProgress.missing,
    freeShippingProgress.ratio,
    freeShippingProgress.reached,
    hasCart,
    cep8.length,
    cepInput,
    shippingEstimated,
    shippingMethod,
    subtotalRaw,
    protectionTotal,
  ]);

  const renderRecoRow = useCallback(() => {
    if (!hasCart) return null;

    return (
      <View style={styles.recoWrap}>
        <FlatList
          data={recommended}
          keyExtractor={(p) => String(p.id)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 12, paddingTop: 12 }}
          renderItem={({ item }) => {
            const img = toImageSource((item as any).image);
            const unit = Number((item as any).price ?? 0);
            const unitFinal = calcUnitWithProductDiscount(unit, (item as any).discountPercent);
            const hasPromo = unitFinal !== unit;

            return (
              <Pressable
                onPress={() => router.push(`/product/${String(item.id)}` as any)}
                style={styles.recoCard}
                accessibilityRole="button"
                accessibilityLabel={`Abrir recomendado ${String(item.title)}`}
              >
                <View style={styles.recoImgWrap}>
                  {img ? <Image source={img} style={styles.recoImg} resizeMode="cover" /> : <View style={styles.recoImgPh} />}
                </View>

                <ThemedText numberOfLines={2} style={styles.recoName}>
                  {String(item.title)}
                </ThemedText>

                <View style={styles.priceLine}>
                  {hasPromo ? <ThemedText style={styles.priceStrikedSmall}>{formatCurrency(unit)}</ThemedText> : null}
                  <ThemedText style={styles.recoPrice}>{formatCurrency(unitFinal)}</ThemedText>
                </View>

                <Pressable
                  onPress={() => {
                    softHaptic();
                    safeAdd(String(item.id));
                  }}
                  style={styles.recoAdd}
                  accessibilityRole="button"
                  accessibilityLabel="Adicionar recomendado ao carrinho"
                >
                  <ThemedText style={styles.recoAddText}>Adicionar</ThemedText>
                </Pressable>
              </Pressable>
            );
          }}
        />
      </View>
    );
  }, [hasCart, recommended, safeAdd]);

  const renderRow = useCallback(
    ({ item }: { item: Row }) => {
      if (item.type === "deal") return renderDeal({ item });
      if (item.type === "cart") return renderCartItem({ item });
      if (item.type === "summary") return renderSummaryRow();
      if (item.type === "reco") return renderRecoRow();
      if (item.type === "saved") return renderSavedRow();
      return null;
    },
    [renderCartItem, renderDeal, renderRecoRow, renderSavedRow, renderSummaryRow]
  );

  // Header: back + título + botão Início (porque tabbar fica escondida no Carrinho)
  const goBackOrHome = useCallback(() => {
    const anyRouter = router as any;
    if (typeof anyRouter?.canGoBack === "function" && anyRouter.canGoBack()) {
      router.back();
      return;
    }
    router.push("/(tabs)" as any);
  }, []);

  const goHome = useCallback(() => router.push("/(tabs)" as any), []);

  const goCheckout = useCallback(() => {
    if (!anySelected) {
      Alert.alert("Carrinho", "Selecione pelo menos 1 item para continuar.");
      return;
    }
    softHaptic();
    router.push("/(tabs)/checkout/address" as any);
  }, [anySelected]);

  const protectionModalPlans = useMemo(() => {
    if (!protectionModalFor) return [];
    return buildProtectionPlans(protectionModalFor.unitFinal);
  }, [protectionModalFor]);

  const protectionModalChosen = useMemo(() => {
    if (!protectionModalFor) return undefined;
    return protectionById[protectionModalFor.id];
  }, [protectionById, protectionModalFor]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={goBackOrHome} hitSlop={12} style={styles.backBtn} accessibilityRole="button">
            <ThemedText style={styles.backIcon}>←</ThemedText>
          </Pressable>

          <ThemedText style={styles.title}>Carrinho</ThemedText>

          <Pressable onPress={goHome} hitSlop={12} style={styles.homeBtn} accessibilityRole="button" accessibilityLabel="Ir para Início">
            <ThemedText style={styles.homeBtnText}>Início</ThemedText>
          </Pressable>
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
          contentContainerStyle={{ paddingBottom: hasCart ? 140 : 20 }}
          ListHeaderComponent={headerContent}
        />

        {hasCart ? (
          <View style={styles.bottomBar}>
            <View style={styles.totalBox}>
              <ThemedText style={styles.totalLabel}>Total</ThemedText>
              <View style={{ alignItems: "flex-end" }}>
                <ThemedText style={styles.totalValue}>{formatCurrency(total)}</ThemedText>
                <ThemedText style={styles.totalMeta}>{selectedCount} selecionado(s)</ThemedText>
              </View>
            </View>

            <Pressable
              onPress={goCheckout}
              disabled={!anySelected}
              style={[styles.ctaPrimary, !anySelected ? styles.ctaPrimaryDisabled : null]}
              accessibilityRole="button"
              accessibilityLabel="Continuar a compra"
            >
              <ThemedText style={[styles.ctaPrimaryText, !anySelected ? styles.ctaPrimaryTextDisabled : null]}>
                Continuar a compra
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        <Modal visible={!!protectionModalFor} transparent animationType="fade" onRequestClose={() => setProtectionModalFor(null)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setProtectionModalFor(null)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setProtectionModalFor(null)} hitSlop={12} style={styles.modalClose}>
                <ThemedText style={styles.modalCloseText}>×</ThemedText>
              </Pressable>
              <ThemedText style={styles.modalTitle}>Incluir proteção</ThemedText>
              <View style={{ width: 32 }} />
            </View>

            <View style={styles.modalBody}>
              {protectionModalPlans.map((p) => {
                const isOn = protectionModalChosen === p.months;
                return (
                  <Pressable
                    key={String(p.months)}
                    onPress={() => {
                      if (!protectionModalFor) return;
                      chooseProtection(protectionModalFor.id, p.months);
                    }}
                    style={[styles.planCard, isOn ? styles.planCardOn : null]}
                    accessibilityRole="button"
                    accessibilityLabel={`Selecionar garantia ${p.months} meses`}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <View style={[styles.planCheck, isOn ? styles.planCheckOn : styles.planCheckOff]}>
                          {isOn ? <View style={styles.planDot} /> : null}
                        </View>
                        <View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <ThemedText style={styles.planTitle}>Garantia Estendida {p.months} meses</ThemedText>
                            {p.recommended ? (
                              <View style={styles.planBadge}>
                                <ThemedText style={styles.planBadgeText}>Recomendado</ThemedText>
                              </View>
                            ) : null}
                          </View>
                          <ThemedText style={styles.planSub}>
                            {p.installments}x de {formatCurrency(p.price / p.installments)} sem juros • ou {formatCurrency(p.price)} no Pix
                          </ThemedText>
                        </View>
                      </View>

                      <ThemedText style={styles.planPrice}>{formatCurrency(p.price)}</ThemedText>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalFooter}>
              <Pressable
                onPress={() => {
                  if (protectionModalFor) removeProtection(protectionModalFor.id);
                  setProtectionModalFor(null);
                }}
                style={styles.modalBtnOutline}
                accessibilityRole="button"
                accessibilityLabel="Agora não"
              >
                <ThemedText style={styles.modalBtnOutlineText}>Agora não</ThemedText>
              </Pressable>

              <Pressable onPress={() => setProtectionModalFor(null)} style={styles.modalBtnPrimary} accessibilityRole="button" accessibilityLabel="Incluir">
                <ThemedText style={styles.modalBtnPrimaryText}>Incluir</ThemedText>
              </Pressable>
            </View>

            <ThemedText style={styles.modalFinePrint}>Ao clicar em &quot;Incluir&quot; você concorda com os termos de autorização de cobrança.</ThemedText>
          </View>
        </Modal>
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

  title: { fontSize: 24, fontFamily: FONT_TITLE, fontWeight: "700", textAlign: "center", color: theme.colors.text },

  homeBtn: { minWidth: 54, height: 40, borderRadius: 999, alignItems: "flex-end", justifyContent: "center" },
  homeBtnText: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.primary },

  sectionHeader: { paddingTop: 10, paddingBottom: 8, backgroundColor: theme.colors.background },
  sectionHeaderText: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },

  toolsBar: { marginTop: 6, marginBottom: 10, flexDirection: "row", gap: 10 },
  toolsBtn: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  toolsBtnText: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },
  toolsBtnDanger: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.35)",
    backgroundColor: "rgba(239,68,68,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  toolsBtnDangerText: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: "rgba(185,28,28,1)" },
  toolsBtnDisabled: { opacity: 0.45 },

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
  fomo: { marginTop: 4, fontSize: 11, fontFamily: FONT_BODY_BOLD, color: "rgba(185,28,28,0.95)" },

  priceRow: { marginTop: 6, flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  price: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },
  // Etapa 17: “/ un” discreto
  unit: { fontSize: 11, fontFamily: FONT_BODY, color: "rgba(0,0,0,0.60)" },

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
  qtyText: { fontSize: 12, fontFamily: FONT_BODY_BOLD, minWidth: 18, textAlign: "center", color: theme.colors.text },

  itemActionsRow: { marginTop: 6, flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  actionPill: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  actionPillText: { fontSize: 11, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },
  actionPillDanger: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.35)",
    backgroundColor: "rgba(239,68,68,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionPillDangerText: { fontSize: 11, fontFamily: FONT_BODY_BOLD, color: "rgba(185,28,28,1)" },

  // Etapa 17: total do item mais evidente
  lineTotal: { fontSize: 13, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },

  protectionRow: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  protectionCheck: { width: 18, height: 18, borderRadius: 6, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  protectionCheckOff: { borderColor: theme.colors.divider, backgroundColor: theme.colors.surface },
  protectionCheckOn: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
  protectionDot: { width: 8, height: 8, borderRadius: 3, backgroundColor: "#fff" },

  protectionTitle: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },
  protectionSub: { marginTop: 3, fontSize: 11, fontFamily: FONT_BODY, color: "rgba(0,0,0,0.65)" },

  badgeRec: { paddingHorizontal: 10, height: 22, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.06)", alignItems: "center", justifyContent: "center" },
  badgeRecText: { fontSize: 11, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },

  protectionRemove: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.35)",
    backgroundColor: "rgba(239,68,68,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  protectionRemoveText: { fontSize: 11, fontFamily: FONT_BODY_BOLD, color: "rgba(185,28,28,1)" },

  priceLine: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  priceStriked: { fontSize: 11, fontFamily: FONT_BODY, color: "rgba(0,0,0,0.55)", textDecorationLine: "line-through" },
  priceStrikedSmall: { fontSize: 10, fontFamily: FONT_BODY, color: "rgba(0,0,0,0.55)", textDecorationLine: "line-through" },

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

  blockStack: { gap: 10, marginBottom: 8 },
  blockCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: 12,
  },
  blockTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  blockTitle: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },
  blockText: { marginTop: 2, fontSize: 12, fontFamily: FONT_BODY, color: theme.colors.text },
  blockTextBold: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },

  linkDanger: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: "rgba(185,28,28,1)" },

  progressTrack: {
    marginTop: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.08)",
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: theme.colors.primary },

  couponRow: { flexDirection: "row", gap: 10, alignItems: "center" },

  input: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: 12,
    fontFamily: FONT_BODY,
    fontSize: 12,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },

  primaryMiniBtn: {
    width: 56,
    height: 42,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryMiniBtnText: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: "#fff" },

  chipsRow: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: { fontSize: 11, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },

  hintText: { marginTop: 8, fontSize: 12, fontFamily: FONT_BODY, color: "rgba(0,0,0,0.65)" },

  segment: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    overflow: "hidden",
    backgroundColor: theme.colors.surface,
    marginTop: 10,
  },
  segmentBtn: { flex: 1, height: 40, alignItems: "center", justifyContent: "center" },
  segmentBtnOn: { backgroundColor: "rgba(0,0,0,0.04)" },
  segmentText: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: "rgba(0,0,0,0.65)" },
  segmentTextOn: { color: theme.colors.text },

  summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  summaryLabel: { fontSize: 12, fontFamily: FONT_BODY, color: "rgba(0,0,0,0.70)" },
  summaryValue: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },

  outlineBtn: {
    marginTop: 12,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineBtnText: { fontSize: 14, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },

  trustRow: { alignItems: "center", justifyContent: "center", paddingTop: 10 },
  trustText: { fontSize: 11, fontFamily: FONT_BODY, color: "rgba(0,0,0,0.55)" },

  recoWrap: {
    marginTop: 6,
    marginBottom: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    overflow: "hidden",
  },
  recoCard: {
    width: 160,
    marginRight: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    padding: 10,
  },
  recoImgWrap: {
    width: "100%",
    height: 92,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  recoImg: { width: "100%", height: "100%" },
  recoImgPh: { flex: 1, backgroundColor: theme.colors.surfaceAlt },
  recoName: { marginTop: 8, fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text, minHeight: 34 },
  recoPrice: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.primary },
  recoAdd: {
    marginTop: 10,
    height: 34,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  recoAddText: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: "#fff" },

  savedWrap: { marginBottom: 8 },
  savedCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  savedLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  savedImageWrap: {
    width: 54,
    height: 54,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  savedImage: { width: "100%", height: "100%" },
  savedImagePh: { flex: 1, backgroundColor: theme.colors.surfaceAlt },
  savedTitle: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },
  savedMeta: { marginTop: 4, fontSize: 11, fontFamily: FONT_BODY, color: "rgba(0,0,0,0.65)" },
  savedRight: { alignItems: "flex-end", gap: 8 },
  savedBtn: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  savedBtnText: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: "#fff" },
  savedBtnOutline: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  savedBtnOutlineText: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },

  bottomBar: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 10,
    gap: 8,
  },

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
  totalLabel: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: "#000" },
  totalValue: { fontSize: 14, fontFamily: FONT_BODY_BOLD, color: "#000" },
  totalMeta: { marginTop: 2, fontSize: 11, fontFamily: FONT_BODY, color: "rgba(0,0,0,0.70)" },

  ctaPrimary: {
    height: 44,
    borderRadius: 14,
    backgroundColor: CTA_GREEN,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    shadowColor: "#000",
    shadowOpacity: 0.10,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  ctaPrimaryText: { fontSize: 16, fontFamily: FONT_BODY_BOLD, color: "#FFFFFF" },
  ctaPrimaryDisabled: { opacity: 0.45 },
  ctaPrimaryTextDisabled: { color: "rgba(255,255,255,0.85)" },

  modalBackdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.35)" },
  modalSheet: {
    marginTop: "auto",
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  modalHeader: {
    height: 52,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  modalClose: { width: 32, height: 32, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  modalCloseText: { fontSize: 24, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },
  modalTitle: { fontSize: 14, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },

  modalBody: { padding: 12, gap: 10 },
  planCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    padding: 12,
  },
  planCardOn: { borderColor: theme.colors.primary },

  planCheck: { width: 18, height: 18, borderRadius: 6, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  planCheckOff: { borderColor: theme.colors.divider, backgroundColor: theme.colors.surface },
  planCheckOn: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },
  planDot: { width: 8, height: 8, borderRadius: 3, backgroundColor: "#fff" },

  planTitle: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },
  planSub: { marginTop: 4, fontSize: 11, fontFamily: FONT_BODY, color: "rgba(0,0,0,0.65)" },
  planPrice: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },

  planBadge: { height: 22, paddingHorizontal: 10, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.06)", alignItems: "center", justifyContent: "center" },
  planBadgeText: { fontSize: 11, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },

  modalFooter: { paddingHorizontal: 12, flexDirection: "row", gap: 10 },
  modalBtnOutline: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnOutlineText: { fontSize: 14, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },

  modalBtnPrimary: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnPrimaryText: { fontSize: 14, fontFamily: FONT_BODY_BOLD, color: "#fff" },

  modalFinePrint: { marginTop: 10, paddingHorizontal: 12, fontSize: 11, fontFamily: FONT_BODY, color: "rgba(0,0,0,0.55)" },
});
