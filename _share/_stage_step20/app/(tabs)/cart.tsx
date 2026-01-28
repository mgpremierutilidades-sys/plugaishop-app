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

  const chooseProtection = useCallback((id: string, months: number) => {
    softHaptic();
    setProtectionById((prev) => ({ ...prev, [id]: months }));
  }, []);

  // Totais (apenas selecionados) — Etapa 20: engine determinístico (centavos)
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

  const subtotalRaw = pricing.subtotalRaw;
  const productDiscountTotal = pricing.productDiscountTotal;
  const couponDiscount = pricing.couponDiscount;
  const discountTotal = pricing.discountTotal;
  const protectionTotal = pricing.protectionTotal;
  const shippingEstimated = pricing.shippingEstimated;
  const total = pricing.total;
  const freeShippingProgress = pricing.freeShippingProgress;

  // Seções
  const sections = useMemo<Section[]>(() => {
    const recos: RecommendationRow[] = (products as Product[])
      .filter((p) => !cartRows.some((r) => r.id === String((p as any).id)))
      .slice(0, 6)
      .map(
        (p): RecommendationRow => ({
          type: "reco",
          id: String((p as any).id),
          title: String((p as any).title ?? "Produto"),
          price: n((p as any).price ?? 0),
          image: (p as any).image,
        })
      );

    return [
      { title: "Seu carrinho", data: cartRows as Row[] },
      { title: "Recomendados", data: recos as Row[] },
    ];
  }, [cartRows]);

  const selectedCount = useMemo(() => {
    return cartRows.reduce((acc, r) => acc + (selected[r.id] ? 1 : 0), 0);
  }, [cartRows, selected]);

  const onContinue = useCallback(() => {
    if (!hasCart) {
      Alert.alert("Carrinho", "Seu carrinho está vazio.");
      return;
    }

    if (selectedCount <= 0) {
      Alert.alert("Carrinho", "Selecione ao menos um item para continuar.");
      return;
    }

    closeProtectionModal();
    router.push("/checkout" as any);
  }, [hasCart, selectedCount, closeProtectionModal]);

  const onClearCart = useCallback(() => {
    if (!hasCart) return;

    Alert.alert("Carrinho", "Deseja limpar o carrinho?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Limpar",
        style: "destructive",
        onPress: () => {
          softHaptic();
          if (typeof (cart as any)?.clearCart === "function") (cart as any).clearCart();
          else if (typeof (cart as any)?.clear === "function") (cart as any).clear();
          else if (typeof (cart as any)?.reset === "function") (cart as any).reset();
        },
      },
    ]);
  }, [cart, hasCart]);

  const onAddReco = useCallback(
    (id: string) => {
      softHaptic();
      const p = (products as Product[]).find((x) => String((x as any).id) === String(id));
      if (!p) return;

      if (typeof (cart as any)?.addItem === "function") (cart as any).addItem(p, 1);
      else if (typeof (cart as any)?.add === "function") (cart as any).add(p, 1);
    },
    [cart]
  );

  const onInc = useCallback(
    (id: string) => {
      softHaptic();
      const item = cartItems.find((it: any) => String(it?.id ?? it?.product?.id) === String(id));
      const product = item?.product ?? item;
      if (!product) return;

      if (typeof (cart as any)?.addItem === "function") (cart as any).addItem(product, 1);
      else if (typeof (cart as any)?.add === "function") (cart as any).add(product, 1);
    },
    [cart, cartItems]
  );

  const onDec = useCallback(
    (id: string) => {
      softHaptic();
      const item = cartItems.find((it: any) => String(it?.id ?? it?.product?.id) === String(id));
      const product = item?.product ?? item;
      if (!product) return;

      if (typeof (cart as any)?.decItem === "function") (cart as any).decItem(product, 1);
      else if (typeof (cart as any)?.remove === "function") (cart as any).remove(product, 1);
    },
    [cart, cartItems]
  );

  const onRemove = useCallback(
    (id: string) => {
      softHaptic();
      if (typeof (cart as any)?.removeItem === "function") (cart as any).removeItem(id);
      else if (typeof (cart as any)?.removeById === "function") (cart as any).removeById(id);
      else if (typeof (cart as any)?.remove === "function") (cart as any).remove(id);
    },
    [cart]
  );

  const renderRow = useCallback(
    ({ item }: { item: Row }) => {
      if (item.type === "reco") {
        const imgSrc: ImageSourcePropType | undefined = item.image ? ({ uri: item.image } as any) : undefined;

        return (
          <ThemedView style={styles.recoCard}>
            <View style={styles.recoLeft}>
              <View style={styles.recoImgWrap}>
                {imgSrc ? <Image source={imgSrc} style={styles.recoImg} /> : <View style={styles.recoImg} />}
              </View>

              <View style={{ flex: 1 }}>
                <ThemedText style={styles.itemTitle} numberOfLines={2}>
                  {item.title}
                </ThemedText>
                <ThemedText style={styles.itemPrice}>{formatCurrency(item.price)}</ThemedText>
              </View>
            </View>

            <Pressable onPress={() => onAddReco(item.id)} style={styles.recoBtn}>
              <ThemedText style={styles.recoBtnText}>Adicionar</ThemedText>
            </Pressable>
          </ThemedView>
        );
      }

      const imgSrc: ImageSourcePropType | undefined = item.image ? ({ uri: item.image } as any) : undefined;
      const isChecked = !!selected[item.id];

      const unitFinal = calcUnitWithProductDiscount(item.price, item.discountPercent);

      return (
        <ThemedView style={styles.itemCard}>
          <View style={styles.itemTopRow}>
            <Pressable onPress={() => toggleSelect(item.id)} hitSlop={10} style={styles.checkbox}>
              <View style={[styles.checkboxBox, isChecked && styles.checkboxOn]}>
                {isChecked ? <ThemedText style={styles.checkboxTick}>✓</ThemedText> : null}
              </View>
            </Pressable>

            <View style={styles.itemImgWrap}>
              {imgSrc ? <Image source={imgSrc} style={styles.itemImg} /> : <View style={styles.itemImg} />}
            </View>

            <View style={{ flex: 1 }}>
              <ThemedText style={styles.itemTitle} numberOfLines={2}>
                {item.title}
              </ThemedText>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <ThemedText style={styles.itemPrice}>{formatCurrency(unitFinal)}</ThemedText>

                {item.discountPercent ? (
                  <ThemedText style={styles.badgeDiscount}>-{Math.round(item.discountPercent)}%</ThemedText>
                ) : null}
              </View>

              {item.unitLabel ? <ThemedText style={styles.itemMeta}>{item.unitLabel}</ThemedText> : null}
            </View>

            <Pressable onPress={() => onRemove(item.id)} hitSlop={10} style={styles.trashBtn}>
              <Icon name="trash" color={"rgba(0,0,0,0.55)"} size={18} />
            </Pressable>
          </View>

          <View style={styles.itemBottomRow}>
            <View style={styles.qtyBox}>
              <Pressable onPress={() => onDec(item.id)} style={styles.qtyBtn}>
                <ThemedText style={styles.qtyBtnText}>–</ThemedText>
              </Pressable>
              <ThemedText style={styles.qtyText}>{item.qty}</ThemedText>
              <Pressable onPress={() => onInc(item.id)} style={styles.qtyBtn}>
                <ThemedText style={styles.qtyBtnText}>+</ThemedText>
              </Pressable>
            </View>

            <View style={{ flex: 1 }} />

            <Pressable
              onPress={() => openProtectionModalFor({ id: item.id, unitFinal })}
              style={styles.protectionBtn}
              hitSlop={6}
            >
              <ThemedText style={styles.protectionBtnText}>
                {protectionById[item.id] ? `Proteção: ${protectionById[item.id]}m` : "Adicionar proteção"}
              </ThemedText>
            </Pressable>

            {protectionById[item.id] ? (
              <Pressable onPress={() => removeProtection(item.id)} hitSlop={6} style={styles.protectionRemoveBtn}>
                <ThemedText style={styles.protectionRemoveText}>Remover</ThemedText>
              </Pressable>
            ) : null}
          </View>
        </ThemedView>
      );
    },
    [onAddReco, onDec, onInc, onRemove, openProtectionModalFor, protectionById, selected, toggleSelect]
  );

  const renderSectionHeader = useCallback(({ section }: { section: Section }) => {
    return (
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
      </View>
    );
  }, []);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <ThemedView style={styles.container}>
        <View style={styles.topbar}>
          <View style={styles.titleRow}>
            <Icon name="cart-outline" color={theme.colors.text} size={20} />
            <ThemedText style={styles.title}>Carrinho</ThemedText>
          </View>

          <Pressable onPress={onClearCart} hitSlop={10} style={styles.clearBtn}>
            <ThemedText style={styles.clearBtnText}>Limpar</ThemedText>
          </Pressable>
        </View>

        <SectionList
          sections={sections}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={renderRow as any}
          renderSectionHeader={renderSectionHeader as any}
          contentContainerStyle={{ paddingBottom: 150 }}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            hasCart ? (
              <ThemedView style={styles.selectAllRow}>
                <Pressable onPress={toggleSelectAll} style={styles.selectAllBtn}>
                  <View style={[styles.checkboxBox, allSelected && styles.checkboxOn]}>
                    {allSelected ? <ThemedText style={styles.checkboxTick}>✓</ThemedText> : null}
                  </View>
                  <ThemedText style={styles.selectAllText}>
                    {allSelected ? "Desmarcar todos" : "Selecionar todos"}
                  </ThemedText>
                </Pressable>

                <ThemedText style={styles.selectAllHint}>
                  {selectedCount}/{cartRows.length} selecionados
                </ThemedText>
              </ThemedView>
            ) : null
          }
        />

        <ThemedView style={styles.bottomBar}>
          <ThemedView style={styles.freeShipCard}>
            <ThemedText style={styles.freeShipTitle}>Frete grátis</ThemedText>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(freeShippingProgress.ratio * 100)}%` }]} />
            </View>

            {freeShippingProgress.reached ? (
              <ThemedText style={styles.freeShipText}>Você ganhou frete grátis.</ThemedText>
            ) : (
              <ThemedText style={styles.freeShipText}>
                Faltam {formatCurrency(freeShippingProgress.missing)} para frete grátis.
              </ThemedText>
            )}
          </ThemedView>

          <ThemedView style={styles.shipCard}>
            <ThemedText style={styles.shipTitle}>Entrega</ThemedText>

            <View style={styles.shipTabs}>
              <Pressable
                onPress={() => setShippingMethod("delivery")}
                style={[styles.shipTab, shippingMethod === "delivery" && styles.shipTabOn]}
              >
                <ThemedText style={[styles.shipTabText, shippingMethod === "delivery" && styles.shipTabTextOn]}>
                  Entregar
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => setShippingMethod("pickup")}
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
                  keyboardType="numeric"
                  style={styles.cepInput}
                  maxLength={9}
                />

                <Pressable
                  onPress={() => {
                    softHaptic();
                    if (!cep8 || cep8.length !== 8) {
                      Alert.alert("CEP", "Digite um CEP válido (8 dígitos).");
                      return;
                    }
                    Alert.alert("Frete", `Estimativa: ${shippingEstimated <= 0 ? "Grátis" : formatCurrency(shippingEstimated)}`);
                  }}
                  style={styles.cepBtn}
                >
                  <ThemedText style={styles.cepBtnText}>Calcular</ThemedText>
                </Pressable>
              </View>
            ) : (
              <ThemedText style={styles.pickupText}>Retire grátis na loja mais próxima.</ThemedText>
            )}

            <View style={styles.shipTotalsRow}>
              <ThemedText style={styles.shipTotalsLabel}>Frete</ThemedText>
              <ThemedText style={styles.shipTotalsValue}>
                {shippingEstimated <= 0 ? "Grátis" : formatCurrency(shippingEstimated)}
              </ThemedText>
            </View>
          </ThemedView>

          <ThemedView style={styles.couponCard}>
            <ThemedText style={styles.couponTitle}>Cupom</ThemedText>

            <View style={styles.couponRow}>
              <TextInput
                value={couponInput}
                onChangeText={setCouponInput}
                placeholder="Digite o cupom"
                autoCapitalize="characters"
                style={styles.couponInput}
              />

              <Pressable onPress={applyCoupon} style={styles.couponBtn}>
                <ThemedText style={styles.couponBtnText}>Aplicar</ThemedText>
              </Pressable>

              <Pressable onPress={clearCoupon} style={styles.couponClearBtn}>
                <ThemedText style={styles.couponClearText}>Limpar</ThemedText>
              </Pressable>
            </View>

            {couponMsg ? <ThemedText style={styles.couponMsg}>{couponMsg}</ThemedText> : null}
          </ThemedView>

          <ThemedView style={styles.totalsCard}>
            <View style={styles.totalsRow}>
              <ThemedText style={styles.totalsLabel}>Subtotal</ThemedText>
              <ThemedText style={styles.totalsValue}>{formatCurrency(subtotalRaw)}</ThemedText>
            </View>

            {productDiscountTotal > 0 ? (
              <View style={styles.totalsRow}>
                <ThemedText style={styles.totalsLabel}>Desconto (produto)</ThemedText>
                <ThemedText style={styles.totalsValue}>- {formatCurrency(productDiscountTotal)}</ThemedText>
              </View>
            ) : null}

            {couponDiscount > 0 ? (
              <View style={styles.totalsRow}>
                <ThemedText style={styles.totalsLabel}>Desconto (cupom)</ThemedText>
                <ThemedText style={styles.totalsValue}>- {formatCurrency(couponDiscount)}</ThemedText>
              </View>
            ) : null}

            {protectionTotal > 0 ? (
              <View style={styles.totalsRow}>
                <ThemedText style={styles.totalsLabel}>Proteção</ThemedText>
                <ThemedText style={styles.totalsValue}>{formatCurrency(protectionTotal)}</ThemedText>
              </View>
            ) : null}

            <View style={styles.totalsRow}>
              <ThemedText style={styles.totalsLabel}>Frete</ThemedText>
              <ThemedText style={styles.totalsValue}>
                {shippingEstimated <= 0 ? "Grátis" : formatCurrency(shippingEstimated)}
              </ThemedText>
            </View>

            <View style={styles.discountRow}>
              <ThemedText style={styles.discountLabel}>Descontos</ThemedText>
              <ThemedText style={styles.discountValue}>- {formatCurrency(discountTotal)}</ThemedText>
            </View>

            <ThemedView style={styles.totalBox}>
              <ThemedText style={styles.totalLabel}>Total</ThemedText>
              <ThemedText style={styles.totalValue}>{formatCurrency(total)}</ThemedText>
            </ThemedView>

            <Pressable onPress={onContinue} style={styles.ctaBtn}>
              <ThemedText style={styles.ctaText}>Continuar a compra</ThemedText>
            </Pressable>
          </ThemedView>
        </ThemedView>

        <Modal visible={!!modalFor} transparent animationType="fade" onRequestClose={closeProtectionModal}>
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
                </>
              ) : null}

              <Pressable onPress={closeProtectionModal} style={styles.modalCloseBtn}>
                <ThemedText style={styles.modalCloseText}>Fechar</ThemedText>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, paddingHorizontal: 16 },

  topbar: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    position: "relative",
    zIndex: 50,
    elevation: 50,
    backgroundColor: theme.colors.background,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontFamily: FONT_TITLE, fontSize: 22, fontWeight: "700", color: theme.colors.text },

  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  clearBtnText: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: theme.colors.text },

  sectionHeader: { paddingTop: 10, paddingBottom: 6 },
  sectionTitle: { fontFamily: FONT_TITLE, fontSize: 16, fontWeight: "700", color: theme.colors.text },

  selectAllRow: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectAllBtn: { flexDirection: "row", alignItems: "center", gap: 10 },
  selectAllText: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: theme.colors.text },
  selectAllHint: { fontFamily: FONT_BODY, fontSize: 12, color: "rgba(0,0,0,0.55)" },

  checkbox: { padding: 4 },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  checkboxTick: { color: "#FFFFFF", fontFamily: FONT_BODY_BOLD, fontSize: 12 },

  itemCard: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    marginBottom: 10,
    gap: 10,
  },
  itemTopRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  itemImgWrap: {
    width: 54,
    height: 54,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  itemImg: { width: "100%", height: "100%" },
  itemTitle: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: theme.colors.text },
  itemPrice: { fontFamily: FONT_TITLE, fontSize: 14, fontWeight: "800", color: theme.colors.text },
  itemMeta: { fontFamily: FONT_BODY, fontSize: 11, color: "rgba(0,0,0,0.55)" },
  badgeDiscount: {
    fontFamily: FONT_BODY_BOLD,
    fontSize: 11,
    color: "#FFFFFF",
    backgroundColor: "#E06666",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
  },
  trashBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.04)",
  },

  itemBottomRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderRadius: 12,
    overflow: "hidden",
  },
  qtyBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  qtyBtnText: { fontFamily: FONT_TITLE, fontSize: 18, fontWeight: "800", color: theme.colors.text },
  qtyText: { width: 38, textAlign: "center", fontFamily: FONT_BODY_BOLD, fontSize: 12, color: theme.colors.text },

  protectionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  protectionBtnText: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: theme.colors.text },

  protectionRemoveBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  protectionRemoveText: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: "rgba(0,0,0,0.65)" },

  recoCard: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  recoLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  recoImgWrap: { width: 54, height: 54, borderRadius: 14, overflow: "hidden", backgroundColor: "rgba(0,0,0,0.04)" },
  recoImg: { width: "100%", height: "100%" },
  recoBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: theme.colors.primary },
  recoBtnText: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: "#FFFFFF" },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    gap: 10,
    zIndex: 10,
    elevation: 10,
  },

  freeShipCard: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    gap: 8,
  },
  freeShipTitle: { fontFamily: FONT_TITLE, fontSize: 14, fontWeight: "700", color: theme.colors.text },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.08)", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: theme.colors.primary },
  freeShipText: { fontFamily: FONT_BODY, fontSize: 12, color: "rgba(0,0,0,0.65)" },

  shipCard: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    gap: 10,
  },
  shipTitle: { fontFamily: FONT_TITLE, fontSize: 14, fontWeight: "700", color: theme.colors.text },

  shipTabs: { flexDirection: "row", gap: 10 },
  shipTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.03)",
    alignItems: "center",
  },
  shipTabOn: { backgroundColor: theme.colors.primary },
  shipTabText: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: theme.colors.text },
  shipTabTextOn: { color: "#FFFFFF" },

  cepRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  cepInput: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: 12,
    fontFamily: FONT_BODY,
    fontSize: 12,
    backgroundColor: "#FFFFFF",
  },
  cepBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: theme.colors.primary },
  cepBtnText: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: "#FFFFFF" },

  pickupText: { fontFamily: FONT_BODY, fontSize: 12, color: "rgba(0,0,0,0.65)" },

  shipTotalsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  shipTotalsLabel: { fontFamily: FONT_BODY, fontSize: 12, color: "rgba(0,0,0,0.65)" },
  shipTotalsValue: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: theme.colors.text },

  couponCard: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    gap: 10,
  },
  couponTitle: { fontFamily: FONT_TITLE, fontSize: 14, fontWeight: "700", color: theme.colors.text },
  couponRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  couponInput: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: 12,
    fontFamily: FONT_BODY,
    fontSize: 12,
    backgroundColor: "#FFFFFF",
  },
  couponBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: theme.colors.primary },
  couponBtnText: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: "#FFFFFF" },
  couponClearBtn: { paddingHorizontal: 10, paddingVertical: 10, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.04)" },
  couponClearText: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: "rgba(0,0,0,0.7)" },
  couponMsg: { fontFamily: FONT_BODY, fontSize: 12, color: "rgba(0,0,0,0.7)" },

  totalsCard: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    gap: 8,
  },
  totalsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  totalsLabel: { fontFamily: FONT_BODY, fontSize: 12, color: "rgba(0,0,0,0.65)" },
  totalsValue: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: theme.colors.text },

  discountRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  discountLabel: { fontFamily: FONT_BODY, fontSize: 12, color: "rgba(0,0,0,0.65)" },
  discountValue: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: theme.colors.text },

  totalBox: {
    marginTop: 8,
    backgroundColor: "#F4B183",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalLabel: { fontFamily: FONT_TITLE, fontSize: 16, fontWeight: "800", color: "#000000" },
  totalValue: { fontFamily: FONT_TITLE, fontSize: 16, fontWeight: "900", color: "#000000" },

  ctaBtn: {
    marginTop: 10,
    backgroundColor: CTA_GREEN,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { fontFamily: FONT_BODY_BOLD, fontSize: 16, color: "#FFFFFF" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    padding: 16,
    justifyContent: "center",
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    gap: 10,
  },
  modalTitle: { fontFamily: FONT_TITLE, fontSize: 16, fontWeight: "800", color: theme.colors.text },

  planRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: "#FFFFFF",
    gap: 10,
  },
  planRowOn: { borderColor: theme.colors.primary, backgroundColor: "rgba(46, 125, 50, 0.08)" },
  planTitle: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: theme.colors.text },
  planMeta: { fontFamily: FONT_BODY, fontSize: 11, color: "rgba(0,0,0,0.6)" },
  planPrice: { fontFamily: FONT_TITLE, fontSize: 14, fontWeight: "900", color: theme.colors.text },

  modalCloseBtn: {
    marginTop: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
  },
  modalCloseText: { fontFamily: FONT_BODY_BOLD, fontSize: 12, color: theme.colors.text },
});
