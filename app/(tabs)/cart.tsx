// app/(tabs)/cart.tsx
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
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
import { computeCartPricing } from "../../utils/cartPricing";
import { formatCurrency } from "../../utils/formatCurrency";
import flags from "../../constants/flags";
import { track } from "../../utils/telemetry";

const FONT_TITLE = "Arimo_400Regular";
const FONT_BODY = "OpenSans_400Regular";
const FONT_BODY_BOLD = "OpenSans_700Bold";

// ==== Regras congeladas do Carrinho (teste/UX) ====
// - Total em box laranja com letra preta
// - CTA verde musgo “Continuar a compra” (mais fino), texto 16 bold
const CTA_GREEN = "#2F5D3A";

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
  category?: string;
  image?: string;
  description?: string;
  unitLabel?: string;
  discountPercent?: number;
};

type RecommendationRow = {
  type: "reco";
  id: string;
  title: string;
  price: number;
  image?: string;
};

type Row = CartRow | RecommendationRow;

type Section = {
  title: string;
  data: Row[];
};

type ProtectionPlan = { months: number; price: number; installments: number; recommended?: boolean };

function clampMoney(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

function normalizeCep(raw: string) {
  return String(raw ?? "").replace(/\D+/g, "").slice(0, 8);
}

function estimateShipping(cep8: string): number {
  if (!cep8 || cep8.length !== 8) return 0;

  const prefix = Number(cep8.slice(0, 2)) || 0;

  if (prefix <= 20) return 19.9;
  if (prefix <= 40) return 24.9;
  if (prefix <= 60) return 29.9;
  return 34.9;
}

function roundToCents(v: number) {
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 100) / 100;
}

// Preço final unitário considerando desconto do produto (não do cupom)
function calcUnitWithProductDiscount(unit: number, discountPercent?: number) {
  const u = clampMoney(unit);
  const pct = Number(discountPercent ?? 0);
  if (!Number.isFinite(pct) || pct <= 0) return u;
  const d = (u * pct) / 100;
  return clampMoney(roundToCents(u - d));
}

function buildProtectionPlans(unitFinal: number): ProtectionPlan[] {
  const u = clampMoney(unitFinal);

  const p12 = roundToCents(Math.min(Math.max(u * 0.13, 9.9), 399));
  const p24 = roundToCents(Math.min(Math.max(u * 0.18, 14.9), 549));

  return [
    { months: 12, price: p12, installments: 10, recommended: true },
    { months: 24, price: p24, installments: 12 },
  ];
}

function softHaptic() {
  Vibration.vibrate(10);
}

function n(value: unknown) {
  const v = Number(value);
  return Number.isFinite(v) ? v : 0;
}

type RecoRowViewProps = {
  id: string;
  title: string;
  price: number;
  image?: string;
};

const RecoRowView = memo(function RecoRowView(props: RecoRowViewProps) {
  const { id, title, price, image } = props;

  const onPress = useCallback(() => {
    softHaptic();
    router.push(`/product/${id}`);
  }, [id]);

  return (
    <Pressable onPress={onPress} style={styles.recoRow}>
      <View style={styles.recoLeft}>
        <View style={styles.recoImageWrap}>
          {!!image ? <Image source={{ uri: image } as ImageSourcePropType} style={styles.recoImage} /> : null}
        </View>

        <View style={{ flex: 1 }}>
          <ThemedText style={styles.recoTitle}>{title}</ThemedText>
          <ThemedText style={styles.recoPrice}>{formatCurrency(price)}</ThemedText>
        </View>
      </View>

      <View style={styles.recoRight}>
        <Icon name="chevron.right" size={18} color={theme.colors.muted} />
      </View>
    </Pressable>
  );
});

type CartRowViewProps = {
  id: string;
  title: string;
  category?: string;
  unitLabel?: string;
  image?: string;
  qty: number;
  selected: boolean;
  unitFinal: number;
  totalRow: number;
  protectionMonths?: number;

  onToggleSelect: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onDecQty: (id: string) => void;
  onIncQty: (id: string) => void;

  onRemoveProtection: (id: string) => void;
  onOpenProtection: (payload: { id: string; unitFinal: number }) => void;
};

const CartRowView = memo(function CartRowView(props: CartRowViewProps) {
  const {
    id,
    title,
    category,
    unitLabel,
    image,
    qty,
    selected,
    unitFinal,
    totalRow,
    protectionMonths,
    onToggleSelect,
    onRemoveItem,
    onDecQty,
    onIncQty,
    onRemoveProtection,
    onOpenProtection,
  } = props;

  const onPressSelect = useCallback(() => onToggleSelect(id), [id, onToggleSelect]);
  const onPressRemove = useCallback(() => onRemoveItem(id), [id, onRemoveItem]);
  const onPressDec = useCallback(() => onDecQty(id), [id, onDecQty]);
  const onPressInc = useCallback(() => onIncQty(id), [id, onIncQty]);
  const onPressRemoveProtection = useCallback(() => onRemoveProtection(id), [id, onRemoveProtection]);
  const onPressOpenProtection = useCallback(() => onOpenProtection({ id, unitFinal }), [id, onOpenProtection, unitFinal]);

  return (
    <ThemedView style={styles.itemCard}>
      <View style={styles.itemTop}>
        <Pressable onPress={onPressSelect} style={styles.checkWrap}>
          <View style={[styles.checkbox, selected && styles.checkboxOn]}>
            {selected ? <Icon name="check" size={14} color="#fff" /> : null}
          </View>
        </Pressable>

        <View style={styles.itemImageWrap}>{!!image ? <Image source={{ uri: image } as ImageSourcePropType} style={styles.itemImage} /> : null}</View>

        <View style={{ flex: 1 }}>
          <ThemedText style={styles.itemTitle}>{title}</ThemedText>
          {!!category ? <ThemedText style={styles.itemMeta}>{category}</ThemedText> : null}
          {!!unitLabel ? <ThemedText style={styles.itemMeta}>{unitLabel}</ThemedText> : null}
        </View>

        <Pressable onPress={onPressRemove} style={styles.trashBtn}>
          <Icon name="trash" size={18} color={theme.colors.muted} />
        </Pressable>
      </View>

      <View style={styles.itemBottom}>
        <View style={styles.qtyRow}>
          <Pressable onPress={onPressDec} style={styles.qtyBtn}>
            <ThemedText style={styles.qtyBtnText}>−</ThemedText>
          </Pressable>

          <View style={styles.qtyVal}>
            <ThemedText style={styles.qtyValText}>{qty}</ThemedText>
          </View>

          <Pressable onPress={onPressInc} style={styles.qtyBtn}>
            <ThemedText style={styles.qtyBtnText}>+</ThemedText>
          </Pressable>
        </View>

        <View style={styles.priceCol}>
          <ThemedText style={styles.unitPrice}>{formatCurrency(unitFinal)}</ThemedText>
          <ThemedText style={styles.rowTotal}>{formatCurrency(totalRow)}</ThemedText>
        </View>
      </View>

      <View style={styles.protectionRow}>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.protectionTitle}>Proteção estendida</ThemedText>
          <ThemedText style={styles.protectionMeta}>{protectionMonths ? `${protectionMonths} meses selecionado` : "Opcional"}</ThemedText>
        </View>

        {protectionMonths ? (
          <Pressable onPress={onPressRemoveProtection} style={styles.protectionBtn}>
            <ThemedText style={styles.protectionBtnText}>Remover</ThemedText>
          </Pressable>
        ) : (
          <Pressable onPress={onPressOpenProtection} style={styles.protectionBtn}>
            <ThemedText style={styles.protectionBtnText}>Escolher</ThemedText>
          </Pressable>
        )}
      </View>
    </ThemedView>
  );
});

export default function CartScreen() {
  const cart = useCart();
  const isFocused = useIsFocused();

  const ffCartPerfV21 = !!flags.ff_cart_perf_v21;
  const ffCartTrackingV21 = !!flags.ff_cart_tracking_v21;

  const cartRef = useRef<any>(cart);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  const prevFocusedRef = useRef<boolean>(false);

  const cartItems = useMemo(() => {
    const items = (cart as any)?.items ?? [];
    return Array.isArray(items) ? items : [];
  }, [(cart as any)?.items]);

  const cartRows = useMemo<CartRow[]>(() => {
    return cartItems.map((it: any) => {
      const product = it?.product ?? it;

      const id = String(it?.id ?? product?.id ?? "");
      const title = String(it?.title ?? product?.title ?? "Produto");
      const price = n(it?.price ?? product?.price ?? 0);
      const qty = Math.max(1, Math.floor(n(it?.qty ?? 1)));
      const category = String(it?.category ?? product?.category ?? "");
      const image = (it?.image ?? product?.image ?? "") as string;
      const description = String(it?.description ?? product?.description ?? "");
      const unitLabel = String(it?.unitLabel ?? product?.unitLabel ?? "");
      const discountPercent = n(it?.discountPercent ?? product?.discountPercent ?? 0) || undefined;

      return {
        type: "cart",
        id,
        title,
        price,
        qty,
        category,
        image,
        description,
        unitLabel,
        discountPercent,
      };
    });
  }, [cartItems]);

  const hasCart = cartRows.length > 0;

  useEffect(() => {
    // view_cart: apenas na transição de foco (evita duplicar por re-render)
    if (ffCartTrackingV21 && isFocused && !prevFocusedRef.current) {
      track("view_cart", {
        items_count: cartRows.length,
        has_cart: cartRows.length > 0,
      });
    }
    prevFocusedRef.current = isFocused;
  }, [ffCartTrackingV21, isFocused, cartRows.length]);

  // Seleção (checkbox)
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSelected((prev) => {
      const next = { ...prev };
      for (const r of cartRows) {
        if (next[r.id] == null) next[r.id] = true;
      }
      for (const k of Object.keys(next)) {
        if (!cartRows.some((r) => r.id === k)) delete next[k];
      }
      return next;
    });
  }, [cartRows]);

  const toggleSelect = useCallback((id: string) => {
    softHaptic();
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const allSelected = useMemo(() => {
    if (!cartRows.length) return false;
    return cartRows.every((r) => selected[r.id]);
  }, [cartRows, selected]);

  const toggleSelectAll = useCallback(() => {
    softHaptic();
    setSelected(() => {
      const next: Record<string, boolean> = {};
      const to = !allSelected;
      for (const r of cartRows) next[r.id] = to;
      return next;
    });
  }, [allSelected, cartRows]);

  // Frete / CEP
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("delivery");
  const [cep, setCep] = useState<string>("");
  const cep8 = useMemo(() => normalizeCep(cep), [cep]);

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

  // Proteção (por item)
  const [protectionById, setProtectionById] = useState<Record<string, number | undefined>>({});
  const [modalFor, setModalFor] = useState<{ id: string; unitFinal: number } | null>(null);

  const openProtectionModalFor = useCallback((payload: { id: string; unitFinal: number }) => {
    softHaptic();
    setModalFor(payload);
  }, []);

  const closeProtectionModal = useCallback(() => {
    setModalFor(null);
  }, []);

  // ✅ FIX HARD: se perdeu foco (troca de aba / navegação), fecha Modal SEMPRE
  useEffect(() => {
    if (!isFocused) closeProtectionModal();
  }, [isFocused, closeProtectionModal]);

  // Mantém também o cleanup por segurança
  useFocusEffect(
    useCallback(() => {
      return () => {
        closeProtectionModal();
      };
    }, [closeProtectionModal])
  );

  const removeProtection = useCallback((id: string) => {
    softHaptic();
    setProtectionById((prev) => ({ ...prev, [id]: undefined }));
  }, []);

  const chooseProtection = useCallback(
    (id: string, months: number) => {
      softHaptic();
      setProtectionById((prev) => ({ ...prev, [id]: months }));
      closeProtectionModal();
    },
    [closeProtectionModal]
  );

  // Recomendações
  const recommendations = useMemo<RecommendationRow[]>(() => {
    const idsInCart = new Set(cartRows.map((r) => r.id));
    const recos = (products ?? []).filter((p: Product) => !idsInCart.has(String(p.id))).slice(0, 6);

    return recos.map((p: any) => ({
      type: "reco",
      id: String(p.id),
      title: String(p.title ?? "Produto"),
      price: n(p.price ?? 0),
      image: String(p.image ?? ""),
    }));
  }, [cartRows]);

  const unitFinalById = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of cartRows) {
      map[r.id] = calcUnitWithProductDiscount(r.price, r.discountPercent);
    }
    return map;
  }, [cartRows]);

  // ✅ Mantém contrato real de CartPricingInput/Output do projeto
  const pricing = useMemo(() => {
    return computeCartPricing({
      rows: cartRows.map((r) => ({
        id: r.id,
        price: r.price,
        qty: r.qty,
        discountPercent: r.discountPercent,
      })),
      selectedById: selected,
      coupon: appliedCoupon as any,
      shippingMethod,
      cep8,
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
      estimateShipping,
      protectionById,
      buildProtectionPlans,
      calcUnitWithProductDiscount,
    });
  }, [appliedCoupon, cartRows, cep8, protectionById, selected, shippingMethod]);

  const removeItem = useCallback((id: string) => {
    softHaptic();
    Alert.alert("Remover item", "Deseja remover este item do carrinho?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => {
          if (ffCartTrackingV21) track("remove_from_cart", { id });
          cartRef.current?.remove?.(id);
        },
      },
    ]);
  }, [ffCartTrackingV21]);

  const incQty = useCallback((id: string) => {
    softHaptic();
    if (ffCartTrackingV21) track("update_qty", { id, delta: +1 });
    cartRef.current?.increment?.(id);
  }, [ffCartTrackingV21]);

  const decQty = useCallback((id: string) => {
    softHaptic();
    if (ffCartTrackingV21) track("update_qty", { id, delta: -1 });
    cartRef.current?.decrement?.(id);
  }, [ffCartTrackingV21]);

  const onContinue = useCallback(() => {
    if (ffCartTrackingV21) {
      track("click_checkout", { from: "cart" });
      track("checkout_start", { from: "cart" });
    }
    router.push("/checkout");
  }, [ffCartTrackingV21]);

  const sections = useMemo<Section[]>(() => {
    const s: Section[] = [];

    s.push({ title: "Produtos no carrinho", data: cartRows });

    if (recommendations.length) {
      s.push({ title: "Talvez você goste", data: recommendations });
    }

    return s;
  }, [cartRows, recommendations]);

  const keyExtractor = useCallback((item: Row) => `${item.type}:${item.id}`, []);

  const renderSectionHeader = useCallback(({ section }: { section: Section }) => {
    return <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>;
  }, []);

  const renderItemLegacy = useCallback(
    ({ item }: { item: Row }) => {
      if (item.type === "reco") {
        return (
          <Pressable
            onPress={() => {
              softHaptic();
              router.push(`/product/${item.id}`);
            }}
            style={styles.recoRow}
          >
            <View style={styles.recoLeft}>
              <View style={styles.recoImageWrap}>
                {!!item.image ? (
                  <Image source={{ uri: item.image } as ImageSourcePropType} style={styles.recoImage} />
                ) : null}
              </View>

              <View style={{ flex: 1 }}>
                <ThemedText style={styles.recoTitle}>{item.title}</ThemedText>
                <ThemedText style={styles.recoPrice}>{formatCurrency(item.price)}</ThemedText>
              </View>
            </View>

            <View style={styles.recoRight}>
              <Icon name="chevron.right" size={18} color={theme.colors.muted} />
            </View>
          </Pressable>
        );
      }

      const unitFinal = unitFinalById[item.id] ?? item.price;
      const totalRow = roundToCents(unitFinal * item.qty);

      return (
        <ThemedView style={styles.itemCard}>
          <View style={styles.itemTop}>
            <Pressable onPress={() => toggleSelect(item.id)} style={styles.checkWrap}>
              <View style={[styles.checkbox, selected[item.id] && styles.checkboxOn]}>
                {selected[item.id] ? <Icon name="check" size={14} color="#fff" /> : null}
              </View>
            </Pressable>

            <View style={styles.itemImageWrap}>
              {!!item.image ? (
                <Image source={{ uri: item.image } as ImageSourcePropType} style={styles.itemImage} />
              ) : null}
            </View>

            <View style={{ flex: 1 }}>
              <ThemedText style={styles.itemTitle}>{item.title}</ThemedText>
              {!!item.category ? <ThemedText style={styles.itemMeta}>{item.category}</ThemedText> : null}
              {!!item.unitLabel ? <ThemedText style={styles.itemMeta}>{item.unitLabel}</ThemedText> : null}
            </View>

            <Pressable onPress={() => removeItem(item.id)} style={styles.trashBtn}>
              <Icon name="trash" size={18} color={theme.colors.muted} />
            </Pressable>
          </View>

          <View style={styles.itemBottom}>
            <View style={styles.qtyRow}>
              <Pressable onPress={() => decQty(item.id)} style={styles.qtyBtn}>
                <ThemedText style={styles.qtyBtnText}>−</ThemedText>
              </Pressable>

              <View style={styles.qtyVal}>
                <ThemedText style={styles.qtyValText}>{item.qty}</ThemedText>
              </View>

              <Pressable onPress={() => incQty(item.id)} style={styles.qtyBtn}>
                <ThemedText style={styles.qtyBtnText}>+</ThemedText>
              </Pressable>
            </View>

            <View style={styles.priceCol}>
              <ThemedText style={styles.unitPrice}>{formatCurrency(unitFinal)}</ThemedText>
              <ThemedText style={styles.rowTotal}>{formatCurrency(totalRow)}</ThemedText>
            </View>
          </View>

          <View style={styles.protectionRow}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.protectionTitle}>Proteção estendida</ThemedText>
              <ThemedText style={styles.protectionMeta}>
                {protectionById[item.id] ? `${protectionById[item.id]} meses selecionado` : "Opcional"}
              </ThemedText>
            </View>

            {protectionById[item.id] ? (
              <Pressable onPress={() => removeProtection(item.id)} style={styles.protectionBtn}>
                <ThemedText style={styles.protectionBtnText}>Remover</ThemedText>
              </Pressable>
            ) : (
              <Pressable onPress={() => openProtectionModalFor({ id: item.id, unitFinal })} style={styles.protectionBtn}>
                <ThemedText style={styles.protectionBtnText}>Escolher</ThemedText>
              </Pressable>
            )}
          </View>
        </ThemedView>
      );
    },
    [decQty, incQty, openProtectionModalFor, protectionById, removeItem, selected, toggleSelect, unitFinalById, removeProtection]
  );

  const renderItemOptimized = useCallback(
    ({ item }: { item: Row }) => {
      if (item.type === "reco") {
        return <RecoRowView id={item.id} title={item.title} price={item.price} image={item.image} />;
      }

      const unitFinal = unitFinalById[item.id] ?? item.price;
      const totalRow = roundToCents(unitFinal * item.qty);

      return (
        <CartRowView
          id={item.id}
          title={item.title}
          category={item.category}
          unitLabel={item.unitLabel}
          image={item.image}
          qty={item.qty}
          selected={!!selected[item.id]}
          unitFinal={unitFinal}
          totalRow={totalRow}
          protectionMonths={protectionById[item.id]}
          onToggleSelect={toggleSelect}
          onRemoveItem={removeItem}
          onDecQty={decQty}
          onIncQty={incQty}
          onRemoveProtection={removeProtection}
          onOpenProtection={openProtectionModalFor}
        />
      );
    },
    [decQty, incQty, openProtectionModalFor, protectionById, removeItem, selected, toggleSelect, unitFinalById, removeProtection]
  );

  const renderItem = ffCartPerfV21 ? renderItemOptimized : renderItemLegacy;

  return (
    <SafeAreaView style={styles.safe}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Icon name="cart" size={20} color={theme.colors.text} style={styles.headerTitleIcon} />
            <ThemedText style={styles.headerTitle}>Carrinho</ThemedText>
          </View>

          <Pressable onPress={toggleSelectAll} style={styles.selectAllBtn}>
            <ThemedText style={styles.selectAllText}>{allSelected ? "Desmarcar" : "Selecionar"}</ThemedText>
          </Pressable>
        </View>

        <SectionList
          sections={sections}
          keyExtractor={keyExtractor}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
        />

        <ThemedView style={styles.footer}>
          {/* Total box laranja */}
          <ThemedView style={styles.totalBox}>
            <View style={styles.totalRow}>
              <ThemedText style={styles.totalLabel}>Subtotal</ThemedText>
              <ThemedText style={styles.totalValue}>{formatCurrency(pricing.subtotalAfterProductDiscount)}</ThemedText>
            </View>

            {!!pricing.discountTotal ? (
              <View style={styles.totalRow}>
                <ThemedText style={styles.totalLabel}>Descontos</ThemedText>
                <ThemedText style={styles.totalValue}>− {formatCurrency(pricing.discountTotal)}</ThemedText>
              </View>
            ) : null}

            {!!pricing.protectionTotal ? (
              <View style={styles.totalRow}>
                <ThemedText style={styles.totalLabel}>Proteção</ThemedText>
                <ThemedText style={styles.totalValue}>{formatCurrency(pricing.protectionTotal)}</ThemedText>
              </View>
            ) : null}

            <View style={styles.totalRow}>
              <ThemedText style={styles.totalLabel}>Frete</ThemedText>
              <ThemedText style={styles.totalValue}>{pricing.shippingEstimated ? formatCurrency(pricing.shippingEstimated) : "—"}</ThemedText>
            </View>

            <View style={[styles.totalRow, { marginTop: 8 }]}>
              <ThemedText style={styles.totalLabelBig}>Total</ThemedText>
              <ThemedText style={styles.totalValueBig}>{formatCurrency(pricing.total)}</ThemedText>
            </View>

            <View style={styles.freeShipBarWrap}>
              <View style={styles.freeShipBarTrack}>
                <View style={[styles.freeShipBarFill, { width: `${Math.round(pricing.freeShippingProgress.ratio * 100)}%` }]} />
              </View>
              <ThemedText style={styles.freeShipText}>
                {pricing.freeShippingProgress.reached
                  ? "Frete grátis desbloqueado!"
                  : `Faltam ${formatCurrency(pricing.freeShippingProgress.missing)} para frete grátis`}
              </ThemedText>
            </View>
          </ThemedView>

          {/* Frete / CEP */}
          <ThemedView style={styles.shippingBox}>
            <ThemedText style={styles.shippingTitle}>Entrega</ThemedText>

            <View style={styles.shipMethodRow}>
              <Pressable
                onPress={() => {
                  softHaptic();
                  setShippingMethod("delivery");
                }}
                style={[styles.shipMethodBtn, shippingMethod === "delivery" && styles.shipMethodBtnOn]}
              >
                <ThemedText style={[styles.shipMethodText, shippingMethod === "delivery" && styles.shipMethodTextOn]}>Receber</ThemedText>
              </Pressable>

              <Pressable
                onPress={() => {
                  softHaptic();
                  setShippingMethod("pickup");
                }}
                style={[styles.shipMethodBtn, shippingMethod === "pickup" && styles.shipMethodBtnOn]}
              >
                <ThemedText style={[styles.shipMethodText, shippingMethod === "pickup" && styles.shipMethodTextOn]}>Retirar</ThemedText>
              </Pressable>
            </View>

            {shippingMethod === "delivery" ? (
              <View style={styles.cepRow}>
                <TextInput
                  value={cep}
                  onChangeText={setCep}
                  placeholder="Digite seu CEP"
                  placeholderTextColor={theme.colors.muted}
                  keyboardType="number-pad"
                  style={styles.cepInput}
                  maxLength={9}
                />
                <Pressable
                  onPress={() => {
                    softHaptic();
                    if (cep8.length !== 8) {
                      Alert.alert("CEP inválido", "Digite um CEP com 8 dígitos.");
                      return;
                    }
                    setCep(cep8);
                  }}
                  style={styles.cepBtn}
                >
                  <ThemedText style={styles.cepBtnText}>OK</ThemedText>
                </Pressable>
              </View>
            ) : (
              <ThemedText style={styles.pickupText}>Retire em uma loja parceira próxima.</ThemedText>
            )}
          </ThemedView>

          {/* Cupom */}
          <ThemedView style={styles.couponBox}>
            <View style={styles.couponTop}>
              <ThemedText style={styles.couponTitle}>Cupom</ThemedText>
              {appliedCoupon ? (
                <Pressable onPress={clearCoupon} style={styles.couponClearBtn}>
                  <ThemedText style={styles.couponClearText}>Limpar</ThemedText>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.couponRow}>
              <TextInput
                value={couponInput}
                onChangeText={setCouponInput}
                placeholder="Ex: PLUGA10"
                placeholderTextColor={theme.colors.muted}
                autoCapitalize="characters"
                style={styles.couponInput}
              />
              <Pressable onPress={applyCoupon} style={styles.couponBtn}>
                <ThemedText style={styles.couponBtnText}>Aplicar</ThemedText>
              </Pressable>
            </View>

            {!!couponMsg ? <ThemedText style={styles.couponMsg}>{couponMsg}</ThemedText> : null}
          </ThemedView>

          {/* CTA */}
          <Pressable onPress={onContinue} style={[styles.cta, !hasCart && styles.ctaDisabled]} disabled={!hasCart}>
            <ThemedText style={styles.ctaText}>Continuar a compra</ThemedText>
          </Pressable>
        </ThemedView>

        {/* Modal Proteção */}
        <Modal visible={!!modalFor} transparent animationType="fade" onRequestClose={closeProtectionModal}>
          <Pressable style={styles.modalOverlay} onPress={closeProtectionModal}>
            <Pressable style={styles.modalCard} onPress={() => null}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>Proteção estendida</ThemedText>
                <Pressable onPress={closeProtectionModal} style={styles.modalClose}>
                  <Icon name="x" size={18} color={theme.colors.muted} />
                </Pressable>
              </View>

              <ThemedText style={styles.modalSub}>Escolha um plano para este item.</ThemedText>

              <View style={styles.plansWrap}>
                {(modalFor ? buildProtectionPlans(modalFor.unitFinal) : []).map((p) => {
                  const months = p.months;
                  const isOn = !!modalFor && protectionById[modalFor.id] === months;

                  return (
                    <Pressable
                      key={months}
                      onPress={() => {
                        if (!modalFor) return;
                        chooseProtection(modalFor.id, months);
                      }}
                      style={[styles.planCard, isOn && styles.planCardOn, (p as any)?.recommended && styles.planCardRec]}
                    >
                      <View style={{ flex: 1 }}>
                        <ThemedText style={[styles.planTitle, isOn && styles.planTitleOn]}>{months} meses</ThemedText>
                        <ThemedText style={[styles.planMeta, isOn && styles.planMetaOn]}>
                          {formatCurrency(p.price)} • em até {(p as any).installments ?? 10}x
                        </ThemedText>
                      </View>

                      {isOn ? <Icon name="check" size={18} color="#fff" /> : <Icon name="chevron.right" size={18} color={theme.colors.muted} />}
                    </Pressable>
                  );
                })}
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, backgroundColor: theme.colors.background },

  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitleIcon: { marginTop: 2 },
  headerTitle: { fontFamily: FONT_TITLE, fontSize: 18, color: theme.colors.text },
  selectAllBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, backgroundColor: theme.colors.card },
  selectAllText: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: theme.colors.text },

  listContent: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 260 },

  sectionTitle: {
    fontFamily: FONT_BODY_BOLD,
    fontSize: 13,
    color: theme.colors.text,
    marginTop: 8,
    marginBottom: 8,
  },

  // Reco
  recoRow: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  recoLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  recoImageWrap: { width: 42, height: 42, borderRadius: 12, backgroundColor: theme.colors.surface, overflow: "hidden" },
  recoImage: { width: 42, height: 42, resizeMode: "cover" },
  recoTitle: { fontFamily: FONT_BODY_BOLD, fontSize: 13, color: theme.colors.text },
  recoPrice: { fontFamily: FONT_BODY, fontSize: 12, color: theme.colors.muted, marginTop: 2 },
  recoRight: { marginLeft: 12 },

  // Item
  itemCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  itemTop: { flexDirection: "row", alignItems: "flex-start" },
  checkWrap: { paddingRight: 10, paddingTop: 4 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkboxOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  itemImageWrap: { width: 54, height: 54, borderRadius: 16, backgroundColor: theme.colors.surface, overflow: "hidden", marginRight: 10 },
  itemImage: { width: 54, height: 54, resizeMode: "cover" },
  itemTitle: { fontFamily: FONT_BODY_BOLD, fontSize: 14, color: theme.colors.text },
  itemMeta: { fontFamily: FONT_BODY, fontSize: 12, color: theme.colors.muted, marginTop: 2 },
  trashBtn: { paddingLeft: 10, paddingTop: 2 },

  itemBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  qtyRow: { flexDirection: "row", alignItems: "center" },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  qtyBtnText: { fontFamily: FONT_BODY_BOLD, fontSize: 16, color: theme.colors.text },
  qtyVal: { width: 36, alignItems: "center", justifyContent: "center" },
  qtyValText: { fontFamily: FONT_BODY_BOLD, fontSize: 14, color: theme.colors.text },

  priceCol: { alignItems: "flex-end" },
  unitPrice: { fontFamily: FONT_BODY, fontSize: 12, color: theme.colors.muted },
  rowTotal: { fontFamily: FONT_BODY_BOLD, fontSize: 14, color: theme.colors.text, marginTop: 2 },

  protectionRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  protectionTitle: { fontFamily: FONT_BODY_BOLD, fontSize: 13, color: theme.colors.text },
  protectionMeta: { fontFamily: FONT_BODY, fontSize: 12, color: theme.colors.muted, marginTop: 2 },
  protectionBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  protectionBtnText: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: theme.colors.text },

  // Footer
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  totalBox: {
    backgroundColor: "#F6A03A",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  totalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  totalLabel: { fontFamily: FONT_BODY, fontSize: 12, color: "#111" },
  totalValue: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: "#111" },
  totalLabelBig: { fontFamily: FONT_BODY_BOLD, fontSize: 14, color: "#111" },
  totalValueBig: { fontFamily: FONT_BODY_BOLD, fontSize: 16, color: "#111" },

  freeShipBarWrap: { marginTop: 10 },
  freeShipBarTrack: { height: 8, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.14)", overflow: "hidden" },
  freeShipBarFill: { height: 8, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.28)" },
  freeShipText: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: "#111", marginTop: 6 },

  shippingBox: {
    marginTop: 10,
    backgroundColor: theme.colors.card,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  shippingTitle: { fontFamily: FONT_BODY_BOLD, fontSize: 13, color: theme.colors.text, marginBottom: 10 },

  shipMethodRow: { flexDirection: "row", gap: 10 },
  shipMethodBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  shipMethodBtnOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  shipMethodText: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: theme.colors.text },
  shipMethodTextOn: { color: "#fff" },

  cepRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  cepInput: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    fontFamily: FONT_BODY_BOLD,
  },
  cepBtn: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  cepBtnText: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: "#fff" },
  pickupText: { fontFamily: FONT_BODY, fontSize: 12, color: theme.colors.muted, marginTop: 10 },

  couponBox: {
    marginTop: 10,
    backgroundColor: theme.colors.card,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  couponTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  couponTitle: { fontFamily: FONT_BODY_BOLD, fontSize: 13, color: theme.colors.text },
  couponClearBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  couponClearText: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: theme.colors.text },

  couponRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  couponInput: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    fontFamily: FONT_BODY_BOLD,
  },
  couponBtn: { height: 44, paddingHorizontal: 14, borderRadius: 14, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  couponBtnText: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: "#fff" },
  couponMsg: { fontFamily: FONT_BODY, fontSize: 12, color: theme.colors.muted, marginTop: 8 },

  cta: {
    marginTop: 10,
    height: 50,
    borderRadius: 18,
    backgroundColor: CTA_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { fontFamily: FONT_BODY_BOLD, fontSize: 16, color: "#fff" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", padding: 16, justifyContent: "center" },
  modalCard: { backgroundColor: theme.colors.card, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: theme.colors.border },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontFamily: FONT_BODY_BOLD, fontSize: 14, color: theme.colors.text },
  modalClose: { padding: 6 },
  modalSub: { fontFamily: FONT_BODY, fontSize: 12, color: theme.colors.muted, marginTop: 6 },

  plansWrap: { marginTop: 12, gap: 10 },
  planCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderRadius: 16, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  planCardOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  planCardRec: { borderColor: theme.colors.primary },
  planTitle: { fontFamily: FONT_BODY_BOLD, fontSize: 13, color: theme.colors.text },
  planTitleOn: { color: "#fff" },
  planMeta: { fontFamily: FONT_BODY, fontSize: 12, color: theme.colors.muted, marginTop: 2 },
  planMetaOn: { color: "rgba(255,255,255,0.92)" },
});
