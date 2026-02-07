// app/(tabs)/cart.tsx
import { router } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Pressable,
  SectionList,
  StyleSheet,
  TextInput,
  View,
  type ImageSourcePropType,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import Toast from "../../components/Toast";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import Icon from "../../components/ui/icon-symbol";
import flags from "../../constants/flags";
import theme from "../../constants/theme";
import { useCart } from "../../context/CartContext";
import { computeCartPricing } from "../../utils/cartPricing";
import { formatCurrency } from "../../utils/formatCurrency";
import { trackSafe } from "../../utils/telemetry";

const FONT_TITLE = "Arimo_400Regular";
const FONT_BODY = "OpenSans_400Regular";
const FONT_BODY_BOLD = "OpenSans_700Bold";

// Regras congeladas do Carrinho (teste/UX)
const CTA_GREEN = "#3F5A3A";
const TOTAL_ORANGE = "#F59E0B";

// Conversão (frete grátis)
const FREE_SHIPPING_THRESHOLD = 199.9;

// TabBar deve permanecer fixa/visível: margem conservadora para não “brigar” com Tabs.
const TABBAR_HEIGHT = 56;

// Cupom (mock exigido)
type Coupon = { code: "PLUGAI10"; type: "percent"; value: 10; label: "10% OFF" };
const COUPON: Coupon = { code: "PLUGAI10", type: "percent", value: 10, label: "10% OFF" };

type Row = {
  type: "cart";
  id: string;
  title: string;
  price: number;
  oldPrice?: number;
  qty: number;
  image?: string;
};

type CartSection = { title: string; data: Row[] };

function n(value: unknown) {
  const v = Number(value);
  return Number.isFinite(v) ? v : 0;
}

function clampQty(qty: unknown) {
  const q = Math.floor(n(qty));
  return Number.isFinite(q) ? Math.max(1, q) : 1;
}

// Frete mock: simples e determinístico. Sem CEP para não redesenhar.
function estimateShippingMock(): number {
  return 19.9;
}

function ProductThumb({ image, size = 72 }: { image?: string; size?: number }) {
  const src: ImageSourcePropType | null =
    typeof image === "string" && image.startsWith("http") ? { uri: image } : null;

  return (
    <View style={[styles.itemImage, { width: size, height: size }]}>
      {src ? (
        <Image source={src} style={{ width: "100%", height: "100%", borderRadius: 12 }} resizeMode="cover" />
      ) : (
        <View style={styles.itemImagePlaceholder} />
      )}
    </View>
  );
}

const CartRowItem = memo(function CartRowItem(props: {
  item: Row;
  checked: boolean;
  onToggle: (_id: string) => void;
  onInc: (_id: string) => void;
  onDec: (_id: string) => void;
  onRemove: (_id: string) => void;
}) {
  const { item, checked, onToggle, onInc, onDec, onRemove } = props;

  const handleToggle = useCallback(() => onToggle(item.id), [onToggle, item.id]);
  const handleInc = useCallback(() => onInc(item.id), [onInc, item.id]);
  const handleDec = useCallback(() => onDec(item.id), [onDec, item.id]);
  const handleRemove = useCallback(() => onRemove(item.id), [onRemove, item.id]);

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemTop}>
        <Pressable
          onPress={handleToggle}
          hitSlop={10}
          style={[styles.checkbox, checked ? styles.checkboxChecked : styles.checkboxUnchecked]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          accessibilityLabel={checked ? "Item selecionado" : "Item não selecionado"}
        >
          {checked ? <Icon name="check" size={14} color="#fff" /> : null}
        </Pressable>

        <ProductThumb image={item.image} />

        <View style={styles.itemInfo}>
          <ThemedText numberOfLines={2} ellipsizeMode="tail" style={styles.itemTitle}>
            {item.title}
          </ThemedText>

          <View style={styles.priceRow}>
            <ThemedText numberOfLines={1} ellipsizeMode="tail" style={styles.price}>
              {formatCurrency(item.price)}
            </ThemedText>
            <ThemedText numberOfLines={1} style={styles.unit}>
              {" "}
              / un
            </ThemedText>
          </View>

          {item.oldPrice ? (
            <ThemedText numberOfLines={1} ellipsizeMode="tail" style={styles.oldPrice}>
              {formatCurrency(item.oldPrice)}
            </ThemedText>
          ) : null}
        </View>
      </View>

      <View style={styles.qtyRow}>
        <Pressable
          onPress={handleDec}
          style={styles.qtyBtn}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Diminuir quantidade"
        >
          <ThemedText style={styles.qtyBtnText}>−</ThemedText>
        </Pressable>

        <ThemedText style={styles.qtyText} numberOfLines={1}>
          {item.qty}
        </ThemedText>

        <Pressable
          onPress={handleInc}
          style={styles.qtyBtn}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Aumentar quantidade"
        >
          <ThemedText style={styles.qtyBtnText}>+</ThemedText>
        </Pressable>

        <View style={styles.rowRight}>
          <ThemedText style={styles.rowTotal} numberOfLines={1} ellipsizeMode="tail">
            {formatCurrency(item.price * item.qty)}
          </ThemedText>

          <Pressable
            onPress={handleRemove}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Remover item"
            style={styles.removeBtn}
          >
            <Icon name="trash" size={16} color={theme.colors.muted} />
          </Pressable>
        </View>
      </View>
    </View>
  );
});

export default function CartTab() {
  const insets = useSafeAreaInsets();

  const cart = useCart();
  const ffTracking = Boolean((flags as any).ff_cart_tracking_v21);

  const items = useMemo(() => {
    const src = (cart as any)?.items ?? [];
    return Array.isArray(src) ? src : [];
  }, [cart]);

  // Normaliza em Row, sem mocks (profissional)
  const rows = useMemo<Row[]>(() => {
    return items
      .map((it: any) => {
        const p = it?.product ?? it;
        const id = String(it?.id ?? p?.id ?? "");
        if (!id) return null;

        return {
          type: "cart",
          id,
          title: String(it?.title ?? p?.title ?? "Produto"),
          price: n(it?.price ?? p?.price ?? 0),
          oldPrice: p?.oldPrice ? n(p.oldPrice) : undefined,
          qty: clampQty(it?.qty ?? it?.quantity ?? 1),
          image: String(it?.image ?? p?.image ?? ""),
        } as Row;
      })
      .filter(Boolean) as Row[];
  }, [items]);

  const hasCart = rows.length > 0;

  // seleção
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setSelected((prev) => {
      const next = { ...prev };
      for (const r of rows) if (next[r.id] == null) next[r.id] = true;
      for (const k of Object.keys(next)) if (!rows.some((r) => r.id === k)) delete next[k];
      return next;
    });
  }, [rows]);

  const allSelected = useMemo(() => hasCart && rows.every((r) => selected[r.id]), [hasCart, rows, selected]);

  const toggleSelectAll = useCallback(() => {
    setSelected(() => {
      const next: Record<string, boolean> = {};
      const to = !allSelected;
      for (const r of rows) next[r.id] = to;
      return next;
    });
  }, [allSelected, rows]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Cupom (mock)
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponMsg, setCouponMsg] = useState<string>("");

  const applyCoupon = useCallback(() => {
    const code = String(couponInput ?? "").trim().toUpperCase();
    if (!code) {
      setCouponMsg("Digite um cupom.");
      return;
    }
    if (code !== COUPON.code) {
      setAppliedCoupon(null);
      setCouponMsg("Cupom inválido.");
      if (ffTracking) trackSafe("cart_coupon_invalid", { code });
      return;
    }
    setAppliedCoupon(COUPON);
    setCouponMsg(`Cupom aplicado: ${COUPON.code} (${COUPON.label})`);
    if (ffTracking) trackSafe("cart_apply_coupon", { code: COUPON.code });
  }, [couponInput, ffTracking]);

  const clearCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponMsg("");
    if (ffTracking) trackSafe("cart_remove_coupon");
  }, [ffTracking]);

  // pricing (resumo)
  const pricing = useMemo(() => {
    return computeCartPricing({
      rows: rows.map((r) => ({ id: r.id, price: r.price, qty: r.qty })),
      selectedById: selected,
      coupon: appliedCoupon as any,
      shippingMethod: "delivery",
      cep8: "",
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
      estimateShipping: () => estimateShippingMock(),
      protectionById: {},
      buildProtectionPlans: () => [],
      calcUnitWithProductDiscount: (unit) => unit,
    });
  }, [appliedCoupon, rows, selected]);

  // throttle de qty (evita rage tap e rerender excessivo)
  const lastActRef = useRef<Record<string, number>>({});
  const canAct = useCallback((key: string, ms = 140) => {
    const now = Date.now();
    const last = lastActRef.current[key] ?? 0;
    if (now - last < ms) return false;
    lastActRef.current[key] = now;
    return true;
  }, []);

  // Toast undo remove
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const undoRef = useRef<null | (() => void)>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = null;
    setToastVisible(false);
    undoRef.current = null;
  }, []);

  const showUndoToast = useCallback((message: string, onUndo: () => void) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    undoRef.current = onUndo;
    setToastMsg(message);
    setToastVisible(true);
    toastTimerRef.current = setTimeout(() => {
      setToastVisible(false);
      toastTimerRef.current = null;
      undoRef.current = null;
    }, 5200);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const onInc = useCallback(
    (id: string) => {
      if (!canAct(`inc:${id}`)) return;
      (cart as any)?.increment?.(id);
      if (ffTracking) trackSafe("cart_increment_qty", { id });
    },
    [canAct, cart, ffTracking]
  );

  const onDec = useCallback(
    (id: string) => {
      if (!canAct(`dec:${id}`)) return;
      (cart as any)?.decrement?.(id);
      if (ffTracking) trackSafe("cart_decrement_qty", { id });
    },
    [canAct, cart, ffTracking]
  );

  const onRemove = useCallback(
    (id: string) => {
      const snapshot = rows.find((r) => r.id === id);
      if (!snapshot) return;

      (cart as any)?.remove?.(id);
      if (ffTracking) trackSafe("cart_remove_item", { id });

      showUndoToast("Item removido.", () => {
        (cart as any)?.add?.(
          {
            id: snapshot.id,
            title: snapshot.title,
            price: snapshot.price,
            qty: snapshot.qty,
            image: snapshot.image,
          },
          snapshot.qty
        );
        if (ffTracking) trackSafe("cart_undo_remove", { id });
        hideToast();
      });
    },
    [cart, ffTracking, hideToast, rows, showUndoToast]
  );

  const sections: CartSection[] = useMemo(() => [{ title: "Produtos", data: rows }], [rows]);

  const goCheckout = useCallback(() => {
    if (ffTracking) trackSafe("checkout_start", { from: "cart" });
    router.push("/checkout" as any);
  }, [ffTracking]);

  // Empty state (sem mexer no rodapé)
  const ListHeader = useMemo(() => {
    if (hasCart) return null;
    return (
      <ThemedView style={styles.emptyCard}>
        <ThemedText style={styles.emptyTitle}>Seu carrinho está vazio</ThemedText>
        <ThemedText style={styles.emptySub} numberOfLines={2} ellipsizeMode="tail">
          Adicione produtos para continuar.
        </ThemedText>
        <Pressable
          onPress={() => router.push("/" as any)}
          style={styles.emptyCta}
          accessibilityRole="button"
          accessibilityLabel="Voltar às compras"
        >
          <ThemedText style={styles.emptyCtaText}>Voltar às compras</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }, [hasCart]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn} accessibilityRole="button">
              <Icon name="chevron.left" size={20} color={theme.colors.text} />
            </Pressable>

            <ThemedText style={styles.title}>Carrinho</ThemedText>
          </View>

          <Pressable
            onPress={toggleSelectAll}
            hitSlop={10}
            style={styles.selectAllBtn}
            accessibilityRole="button"
            accessibilityLabel={allSelected ? "Desmarcar todos" : "Selecionar todos"}
          >
            <ThemedText style={styles.selectAllText}>{allSelected ? "Desmarcar" : "Selecionar"}</ThemedText>
          </Pressable>
        </View>

        <SectionList
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          sections={sections}
          keyExtractor={(it) => `${it.type}-${it.id}`}
          renderItem={({ item }) => (
            <CartRowItem
              item={item}
              checked={Boolean(selected[item.id])}
              onToggle={toggleSelect}
              onInc={onInc}
              onDec={onDec}
              onRemove={onRemove}
            />
          )}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionHeaderText}>{section.title.toUpperCase()}</ThemedText>
            </View>
          )}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={{ paddingBottom: 170 + insets.bottom + TABBAR_HEIGHT }}
        />

        {/* Rodapé fixo: progress frete + cupom + resumo + CTA (sem esconder TabBar) */}
        <View style={[styles.footerBar, { bottom: Math.max(10, insets.bottom + TABBAR_HEIGHT * 0.35) }]}>
          {hasCart ? (
            <ThemedView style={styles.nudgeBox}>
              <ThemedText style={styles.nudgeText} numberOfLines={2} ellipsizeMode="tail">
                {pricing.freeShippingProgress.reached
                  ? "Você ganhou frete grátis"
                  : `Falta ${formatCurrency(pricing.freeShippingProgress.remaining)} para frete grátis`}
              </ThemedText>
            </ThemedView>
          ) : null}

          <ThemedView style={styles.couponBox}>
            <Pressable
              onPress={() => setCouponOpen((v) => !v)}
              style={styles.couponHeader}
              accessibilityRole="button"
              accessibilityLabel="Abrir cupom"
            >
              <ThemedText style={styles.couponTitle}>Cupom</ThemedText>
              <Icon name={couponOpen ? "chevron.down" : "chevron.right"} size={16} color={theme.colors.muted} />
            </Pressable>

            {couponOpen ? (
              <View style={styles.couponRow}>
                <TextInput
                  value={couponInput}
                  onChangeText={setCouponInput}
                  placeholder="Ex: PLUGAI10"
                  placeholderTextColor={theme.colors.muted}
                  autoCapitalize="characters"
                  style={styles.couponInput}
                  returnKeyType="done"
                />

                {appliedCoupon ? (
                  <Pressable onPress={clearCoupon} style={styles.couponBtn} accessibilityRole="button">
                    <ThemedText style={styles.couponBtnText}>Remover</ThemedText>
                  </Pressable>
                ) : (
                  <Pressable onPress={applyCoupon} style={styles.couponBtn} accessibilityRole="button">
                    <ThemedText style={styles.couponBtnText}>Aplicar</ThemedText>
                  </Pressable>
                )}
              </View>
            ) : null}

            {couponMsg ? (
              <ThemedText style={styles.couponMsg} numberOfLines={2} ellipsizeMode="tail">
                {couponMsg}
              </ThemedText>
            ) : null}
          </ThemedView>

          <View style={styles.totalBox}>
            <View style={{ flex: 1 }}>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Subtotal</ThemedText>
                <ThemedText style={styles.summaryValue}>{formatCurrency(pricing.subtotalSelected)}</ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Desconto</ThemedText>
                <ThemedText style={styles.summaryValue}>
                  {pricing.discountTotal > 0 ? `- ${formatCurrency(pricing.discountTotal)}` : "—"}
                </ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Frete</ThemedText>
                <ThemedText style={styles.summaryValue}>
                  {pricing.shippingEstimated === 0 ? "Grátis" : formatCurrency(pricing.shippingEstimated)}
                </ThemedText>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryTotalRow}>
                <ThemedText style={styles.totalLabel}>TOTAL</ThemedText>
                <ThemedText style={styles.totalValue}>{formatCurrency(pricing.total)}</ThemedText>
              </View>
            </View>
          </View>

          <Pressable
            onPress={goCheckout}
            style={[styles.footerBtn, !hasCart && styles.footerBtnDisabled]}
            disabled={!hasCart}
            accessibilityRole="button"
          >
            <ThemedText style={styles.footerBtnText}>CONTINUAR A COMPRA</ThemedText>
          </Pressable>
        </View>

        <Toast
          visible={toastVisible}
          message={toastMsg}
          actionLabel="Desfazer"
          onAction={() => undoRef.current?.()}
          onDismiss={hideToast}
          bottomOffset={insets.bottom + TABBAR_HEIGHT + 8}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },

  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 14,
  },

  header: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 24,
    fontFamily: FONT_TITLE,
    fontWeight: "700",
  },

  selectAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  selectAllText: { fontSize: 12, fontFamily: FONT_BODY_BOLD },

  // PRODUTOS fixo (sticky) e sempre visível
  sectionHeader: {
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: theme.colors.background,
    zIndex: 10,
  },
  sectionHeaderText: { fontSize: 12, fontFamily: FONT_BODY_BOLD, opacity: 0.85 },

  itemCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    marginBottom: 8,
  },

  itemTop: { flexDirection: "row", gap: 10 },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  checkboxUnchecked: { borderColor: theme.colors.divider, backgroundColor: theme.colors.surface },
  checkboxChecked: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },

  itemImage: {
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceAlt,
    overflow: "hidden",
  },
  itemImagePlaceholder: { flex: 1, borderRadius: 12, backgroundColor: theme.colors.surfaceAlt },

  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 11, fontFamily: FONT_BODY_BOLD },
  priceRow: { marginTop: 6, flexDirection: "row", alignItems: "center" },
  price: { fontSize: 11, fontFamily: FONT_BODY_BOLD, opacity: 0.9 },
  unit: { fontSize: 11, fontFamily: FONT_BODY, opacity: 0.7 },
  oldPrice: {
    marginTop: 3,
    fontSize: 11,
    fontFamily: FONT_BODY,
    opacity: 0.6,
    textDecorationLine: "line-through",
  },

  qtyRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
  qtyBtnText: { fontSize: 16, fontFamily: FONT_BODY_BOLD },

  qtyText: { fontSize: 11, fontFamily: FONT_BODY_BOLD, minWidth: 18, textAlign: "center" },

  rowRight: { marginLeft: "auto", alignItems: "flex-end", gap: 6 },
  rowTotal: { fontSize: 12, fontFamily: FONT_BODY_BOLD, opacity: 0.95 },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },

  // Empty
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 12,
  },
  emptyTitle: { fontFamily: FONT_BODY_BOLD, fontSize: 14, color: theme.colors.text },
  emptySub: { fontFamily: FONT_BODY, fontSize: 12, color: theme.colors.muted, marginTop: 6 },
  emptyCta: {
    marginTop: 12,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCtaText: { fontFamily: FONT_BODY_BOLD, fontSize: 13, color: "#fff" },

  // Footer
  footerBar: {
    position: "absolute",
    left: 14,
    right: 14,
    gap: 8,
  },

  nudgeBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  nudgeText: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: theme.colors.text },

  couponBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
  },
  couponHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  couponTitle: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: theme.colors.text },
  couponRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  couponInput: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    fontFamily: FONT_BODY,
    fontSize: 12,
  },
  couponBtn: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  couponBtnText: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: "#fff" },
  couponMsg: { marginTop: 8, fontFamily: FONT_BODY, fontSize: 12, color: theme.colors.muted },

  totalBox: {
    backgroundColor: TOTAL_ORANGE,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  summaryLabel: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: "#000", opacity: 0.9 },
  summaryValue: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: "#000" },
  summaryDivider: { height: 1, backgroundColor: "rgba(0,0,0,0.18)", marginVertical: 8 },
  summaryTotalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  totalLabel: { fontSize: 12, fontFamily: FONT_BODY_BOLD, color: "#000" },
  totalValue: { fontSize: 14, fontFamily: FONT_BODY_BOLD, color: "#000" },

  footerBtn: {
    height: 44,
    borderRadius: 14,
    backgroundColor: CTA_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  footerBtnDisabled: { opacity: 0.5 },
  footerBtnText: {
    fontSize: 16,
    fontFamily: FONT_BODY_BOLD,
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
});
