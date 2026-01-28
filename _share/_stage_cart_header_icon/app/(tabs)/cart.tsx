// app/(tabs)/cart.tsx
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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

export default function CartScreen() {
  const cart = useCart();
  const isFocused = useIsFocused();

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

  const removeItem = useCallback(
    (id: string) => {
      softHaptic();
      Alert.alert("Remover item", "Deseja remover este item do carrinho?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Remover", style: "destructive", onPress: () => (cart as any)?.remove?.(id) },
      ]);
    },
    [cart]
  );

  const incQty = useCallback(
    (id: string) => {
      softHaptic();
      (cart as any)?.increment?.(id);
    },
    [cart]
  );

  const decQty = useCallback(
    (id: string) => {
      softHaptic();
      (cart as any)?.decrement?.(id);
    },
    [cart]
  );

  const onContinue = useCallback(() => {
    router.push("/checkout");
  }, []);

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

  const renderItem = useCallback(
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
    [decQty, incQty, openProtectionModalFor, protectionById, removeItem, selected, toggleSelect, unitFinalById]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Carrinho</ThemedText>

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

        <ThemedView style={styles.bottomBar}>
          <ThemedView style={styles.shipBox}>
            <ThemedText style={styles.shipTitle}>Entrega</ThemedText>

            <View style={styles.shipTabs}>
              <Pressable
                onPress={() => {
                  softHaptic();
                  setShippingMethod("delivery");
                }}
                style={[styles.shipTab, shippingMethod === "delivery" && styles.shipTabOn]}
              >
                <ThemedText style={[styles.shipTabText, shippingMethod === "delivery" && styles.shipTabTextOn]}>
                  Receber
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => {
                  softHaptic();
                  setShippingMethod("pickup");
                }}
                style={[styles.shipTab, shippingMethod === "pickup" && styles.shipTabOn]}
              >
                <ThemedText style={[styles.shipTabText, shippingMethod === "pickup" && styles.shipTabTextOn]}>
                  Retirar
                </ThemedText>
              </Pressable>
            </View>

            {shippingMethod === "delivery" ? (
              <View style={styles.cepRow}>
                <TextInput
                  value={cep}
                  onChangeText={setCep}
                  placeholder="Digite seu CEP"
                  placeholderTextColor={theme.colors.muted}
                  keyboardType="numeric"
                  style={styles.cepInput}
                  maxLength={9}
                />
                <ThemedText style={styles.shipValue}>
                  {pricing.shippingEstimated === 0 ? "Grátis" : formatCurrency(pricing.shippingEstimated)}
                </ThemedText>
              </View>
            ) : (
              <ThemedText style={styles.pickupHint}>Retire em uma loja parceira.</ThemedText>
            )}

            {!!hasCart && pricing.freeShippingProgress?.reached ? (
              <ThemedText style={styles.freeShip}>
                Frete grátis acima de {formatCurrency(FREE_SHIPPING_THRESHOLD)}
              </ThemedText>
            ) : null}
          </ThemedView>

          <ThemedView style={styles.couponBox}>
            <ThemedText style={styles.couponTitle}>Cupom</ThemedText>

            <View style={styles.couponRow}>
              <TextInput
                value={couponInput}
                onChangeText={setCouponInput}
                placeholder="Digite o cupom"
                placeholderTextColor={theme.colors.muted}
                style={styles.couponInput}
                autoCapitalize="characters"
              />

              <Pressable onPress={applyCoupon} style={styles.couponBtn}>
                <ThemedText style={styles.couponBtnText}>Aplicar</ThemedText>
              </Pressable>

              <Pressable onPress={clearCoupon} style={styles.couponClearBtn}>
                <ThemedText style={styles.couponClearText}>X</ThemedText>
              </Pressable>
            </View>

            {!!couponMsg ? <ThemedText style={styles.couponMsg}>{couponMsg}</ThemedText> : null}
          </ThemedView>

          <ThemedView style={styles.totalBox}>
            <ThemedText style={styles.totalLabel}>Total</ThemedText>
            <ThemedText style={styles.totalValue}>{formatCurrency(pricing.total)}</ThemedText>
          </ThemedView>

          <ThemedView style={styles.ctaWrap}>
            <Pressable onPress={onContinue} style={styles.ctaBtn}>
              <ThemedText style={styles.ctaText}>Continuar a compra</ThemedText>
            </Pressable>
          </ThemedView>
        </ThemedView>

        {/* ✅ FIX: não renderizar Modal fora de foco (evita vazamento de overlay/opacidade entre abas) */}
        {isFocused && (
          <Modal visible={isFocused && !!modalFor} transparent animationType="fade" onRequestClose={closeProtectionModal}>
            <Pressable style={styles.modalOverlay} onPress={closeProtectionModal}>
              <Pressable style={styles.modalCard} onPress={() => {}}>
                <ThemedText style={styles.modalTitle}>Proteção estendida</ThemedText>

                {modalFor ? (
                  <>
                    {buildProtectionPlans(modalFor.unitFinal).map((p) => {
                      const selectedMonths = protectionById[modalFor.id];
                      const isOn = selectedMonths === p.months;

                      return (
                        <Pressable
                          key={p.months}
                          onPress={() => chooseProtection(modalFor.id, p.months)}
                          style={[styles.planRow, isOn && styles.planRowOn]}
                        >
                          <View style={{ flex: 1 }}>
                            <ThemedText style={styles.planTitle}>
                              {p.months} meses {p.recommended ? "• Recomendado" : ""}
                            </ThemedText>
                            <ThemedText style={styles.planMeta}>{p.installments}x sem juros</ThemedText>
                          </View>

                          <ThemedText style={styles.planPrice}>{formatCurrency(p.price)}</ThemedText>
                        </Pressable>
                      );
                    })}

                    <Pressable onPress={closeProtectionModal} style={styles.modalCloseBtn}>
                      <ThemedText style={styles.modalCloseText}>Fechar</ThemedText>
                    </Pressable>
                  </>
                ) : null}
              </Pressable>
            </Pressable>
          </Modal>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  headerTitle: { fontFamily: FONT_TITLE, fontSize: 22, color: theme.colors.text },
  selectAllBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: theme.colors.surface },
  selectAllText: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: theme.colors.text },

  listContent: { paddingBottom: 12 },
  sectionTitle: { fontFamily: FONT_BODY_BOLD, fontSize: 13, color: theme.colors.muted, marginVertical: 8 },

  itemCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    marginBottom: 10,
  },
  itemTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkWrap: { padding: 4 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
  checkboxOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },

  itemImageWrap: { width: 58, height: 58, borderRadius: 16, backgroundColor: theme.colors.background, overflow: "hidden" },
  itemImage: { width: "100%", height: "100%" },

  itemTitle: { fontFamily: FONT_BODY_BOLD, fontSize: 13, color: theme.colors.text },
  itemMeta: { fontFamily: FONT_BODY, fontSize: 12, color: theme.colors.muted, marginTop: 2 },

  trashBtn: { padding: 8 },

  itemBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },

  qtyRow: { flexDirection: "row", alignItems: "center", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: theme.colors.divider },
  qtyBtn: { width: 38, height: 34, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.background },
  qtyBtnText: { fontFamily: FONT_BODY_BOLD, fontSize: 16, color: theme.colors.text },
  qtyVal: { width: 44, height: 34, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surface },
  qtyValText: { fontFamily: FONT_BODY_BOLD, fontSize: 13, color: theme.colors.text },

  priceCol: { alignItems: "flex-end" },
  unitPrice: { fontFamily: FONT_BODY, fontSize: 12, color: theme.colors.muted },
  rowTotal: { fontFamily: FONT_BODY_BOLD, fontSize: 14, color: theme.colors.text, marginTop: 2 },

  protectionRow: { flexDirection: "row", alignItems: "center", marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.divider },
  protectionTitle: { fontFamily: FONT_BODY_BOLD, fontSize: 13, color: theme.colors.text },
  protectionMeta: { fontFamily: FONT_BODY, fontSize: 12, color: theme.colors.muted, marginTop: 2 },
  protectionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.divider },
  protectionBtnText: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: theme.colors.primary },

  recoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    marginBottom: 10,
  },
  recoLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  recoImageWrap: { width: 54, height: 54, borderRadius: 16, backgroundColor: theme.colors.background, overflow: "hidden" },
  recoImage: { width: "100%", height: "100%" },
  recoTitle: { fontFamily: FONT_BODY_BOLD, fontSize: 13, color: theme.colors.text },
  recoPrice: { fontFamily: FONT_BODY, fontSize: 12, color: theme.colors.muted, marginTop: 4 },
  recoRight: { paddingLeft: 8 },

  bottomBar: { paddingTop: 8, paddingBottom: 10 },

  shipBox: { backgroundColor: theme.colors.surface, borderRadius: 20, padding: 12, borderWidth: 1, borderColor: theme.colors.divider, marginBottom: 10 },
  shipTitle: { fontFamily: FONT_BODY_BOLD, fontSize: 13, color: theme.colors.text, marginBottom: 8 },

  shipTabs: { flexDirection: "row", gap: 8, marginBottom: 10 },
  shipTab: { flex: 1, paddingVertical: 10, borderRadius: 16, alignItems: "center", backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.divider },
  shipTabOn: { borderColor: theme.colors.primary },
  shipTabText: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: theme.colors.muted },
  shipTabTextOn: { color: theme.colors.text },

  cepRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  cepInput: {
    flex: 1,
    height: 42,
    borderRadius: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    fontFamily: FONT_BODY,
  },
  shipValue: { fontFamily: FONT_BODY_BOLD, fontSize: 13, color: theme.colors.text },
  pickupHint: { fontFamily: FONT_BODY, fontSize: 12, color: theme.colors.muted },

  freeShip: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: theme.colors.primary, marginTop: 8 },

  couponBox: { backgroundColor: theme.colors.surface, borderRadius: 20, padding: 12, borderWidth: 1, borderColor: theme.colors.divider, marginBottom: 10 },
  couponTitle: { fontFamily: FONT_BODY_BOLD, fontSize: 13, color: theme.colors.text, marginBottom: 8 },
  couponRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  couponInput: {
    flex: 1,
    height: 42,
    borderRadius: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    fontFamily: FONT_BODY,
  },
  couponBtn: { height: 42, paddingHorizontal: 12, borderRadius: 16, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" },
  couponBtnText: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: "#fff" },
  couponClearBtn: { height: 42, width: 42, borderRadius: 16, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.divider, alignItems: "center", justifyContent: "center" },
  couponClearText: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: theme.colors.muted },
  couponMsg: { fontFamily: FONT_BODY, fontSize: 12, color: theme.colors.muted, marginTop: 8 },

  totalBox: {
    backgroundColor: "#F59B2B",
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalLabel: { fontFamily: FONT_BODY_BOLD, fontSize: 13, color: "#111" },
  totalValue: { fontFamily: FONT_BODY_BOLD, fontSize: 16, color: "#111" },

  ctaWrap: { marginBottom: 2 },
  ctaBtn: { height: 48, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: CTA_GREEN },
  ctaText: { fontFamily: FONT_BODY_BOLD, fontSize: 16, color: "#fff" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", padding: 16 },
  modalCard: { width: "100%", borderRadius: 20, backgroundColor: theme.colors.surface, padding: 16, borderWidth: 1, borderColor: theme.colors.divider },
  modalTitle: { fontFamily: FONT_BODY_BOLD, fontSize: 15, color: theme.colors.text, marginBottom: 10 },

  planRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.background,
    marginBottom: 8,
  },
  planRowOn: { borderColor: theme.colors.primary },
  planTitle: { fontFamily: FONT_BODY_BOLD, fontSize: 13, color: theme.colors.text },
  planMeta: { fontFamily: FONT_BODY, fontSize: 12, color: theme.colors.muted, marginTop: 2 },
  planPrice: { fontFamily: FONT_BODY_BOLD, fontSize: 13, color: theme.colors.text },

  modalCloseBtn: { marginTop: 8, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primary },
  modalCloseText: { fontFamily: FONT_BODY_BOLD, fontSize: 13, color: "#fff" },
});
