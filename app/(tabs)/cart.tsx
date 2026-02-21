import { router } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type ListRenderItemInfo,
} from "react-native";

import { AppHeader } from "../../components/AppHeader";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import IconSymbolDefault from "../../components/ui/icon-symbol";
import { isFlagEnabled } from "../../constants/flags";
import theme from "../../constants/theme";
import { useCart } from "../../context/CartContext";
import type { Product } from "../../data/catalog";
import { products } from "../../data/catalog";
import { track } from "../../lib/analytics";
import { startCheckout } from "../../lib/checkout";
import { formatCurrency } from "../../utils/formatCurrency";

const FONT_BODY = "OpenSans_400Regular";
const FONT_BODY_BOLD = "OpenSans_700Bold";

const WHITE = "#FFFFFF";
const DANGER = "#DC2626";
const SUCCESS = "#16A34A";

type Row = {
  type: "cart";
  id: string;
  title: string;
  price: number;
  oldPrice?: number;
  qty: number;
  image?: string;
};

type CartSection = {
  title: string;
  data: Row[];
};

const ProductThumb = memo(function ProductThumb({
  image,
  size = 72,
}: {
  image?: string;
  size?: number;
}) {
  const src: ImageSourcePropType | null =
    typeof image === "string" && image.startsWith("http") ? { uri: image } : null;

  return (
    <View style={styles.itemImage}>
      {src ? (
        <Image
          source={src}
          style={{ width: size, height: size, borderRadius: 12 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[styles.itemImagePlaceholder, { width: size, height: size }]}
        />
      )}
    </View>
  );
});

const PrimaryButton = memo(function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.primaryBtn,
        disabled ? styles.primaryBtnDisabled : null,
        pressed && !disabled ? styles.primaryBtnPressed : null,
      ]}
    >
      <ThemedText
        style={[
          styles.primaryBtnText,
          { fontFamily: FONT_BODY_BOLD },
          disabled ? { opacity: 0.75 } : null,
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
});

const SmallChip = memo(function SmallChip({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed ? { opacity: 0.85 } : null]}
      accessibilityRole="button"
    >
      <ThemedText style={[styles.chipText, { fontFamily: FONT_BODY_BOLD }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
});

const ProgressBar = memo(function ProgressBar({
  value,
  max,
}: {
  value: number;
  max: number;
}) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));
  return (
    <View style={styles.progressOuter}>
      <View
        style={[styles.progressInner, { width: `${Math.round(pct * 100)}%` }]}
      />
    </View>
  );
});

function RecommendationsCrossSell({
  enabled,
  cartItemIds,
  onAdd,
}: {
  enabled: boolean;
  cartItemIds: string[];
  onAdd: (p: Product) => void;
}) {
  const recs = useMemo(() => {
    if (!enabled) return [] as Product[];
    const ids = new Set(cartItemIds.map(String));
    return (products as Product[]).filter((p) => !ids.has(String(p.id))).slice(0, 4);
  }, [enabled, cartItemIds]);

  useEffect(() => {
    if (!enabled) return;
    if (recs.length === 0) return;
    if (isFlagEnabled("ff_cart_analytics_v1")) {
      track("cart_cross_sell_impression", { count: recs.length });
    }
  }, [enabled, recs.length]);

  if (!enabled || recs.length === 0) return null;

  return (
    <View style={{ marginTop: 8 }}>
      <ThemedText
        style={{
          fontFamily: FONT_BODY_BOLD,
          fontSize: 14,
          marginBottom: 10,
          color: theme.colors.text,
        }}
      >
        Você também pode gostar
      </ThemedText>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 12 }}
      >
        {recs.map((p) => (
          <Pressable
            key={String(p.id)}
            onPress={() => {
              if (isFlagEnabled("ff_cart_analytics_v1")) {
                track("cart_cross_sell_tap", { item_id: String(p.id) });
              }
              onAdd(p);
            }}
            style={({ pressed }) => [
              styles.crossSellCard,
              pressed ? { opacity: 0.9 } : null,
            ]}
          >
            <ProductThumb image={(p as any).image} size={64} />
            <ThemedText
              style={{
                fontFamily: FONT_BODY_BOLD,
                fontSize: 12,
                marginTop: 10,
                color: theme.colors.text,
              }}
              numberOfLines={2}
            >
              {p.title}
            </ThemedText>
            <ThemedText
              style={{
                fontFamily: FONT_BODY_BOLD,
                fontSize: 13,
                marginTop: 6,
                color: theme.colors.text,
              }}
            >
              {formatCurrency(p.price)}
            </ThemedText>
            <View style={{ marginTop: 10 }}>
              <ThemedText
                style={{
                  fontFamily: FONT_BODY_BOLD,
                  fontSize: 12,
                  color: theme.colors.primary,
                }}
              >
                Adicionar
              </ThemedText>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export default function CartTab() {
  const cartCtx = useCart() as any;

  const uiV2 = isFlagEnabled("ff_cart_ui_v2");
  const cartUxUpgrade = isFlagEnabled("ff_cart_ux_upgrade_v1");
  const crossSellV1 = isFlagEnabled("ff_cart_cross_sell_v1");

  const actionLocksRef = useRef<Record<string, number>>({});
  const ACTION_LOCK_MS = 250;

  const withActionLock = useCallback((key: string, fn: () => void) => {
    if (!isFlagEnabled("ff_cart_action_lock")) return fn();

    const now = Date.now();
    const last = actionLocksRef.current[key] ?? 0;

    if (now - last < ACTION_LOCK_MS) {
      if (isFlagEnabled("ff_cart_analytics_v1")) {
        track("cart_double_action_prevented", { key });
      }
      return;
    }

    actionLocksRef.current[key] = now;
    fn();
  }, []);

  const seededRows = useMemo<Row[]>(() => {
    const base = (products as Product[]).slice(0, 6);
    return base.map((p, idx) => ({
      type: "cart",
      id: p.id,
      title: p.title,
      price: p.price,
      oldPrice: idx % 2 === 0 ? Math.round(p.price * 1.18 * 100) / 100 : undefined,
      qty: 1 + (idx % 3),
      image: (p as any).image,
    }));
  }, []);

  const [localRows, setLocalRows] = useState<Row[]>(seededRows);

  useEffect(() => {
    if (isFlagEnabled("ff_cart_analytics_v1")) track("cart_view");
  }, []);

  const ctxItems = useMemo(() => {
    return (cartCtx?.items ?? cartCtx?.cartItems ?? cartCtx?.cart ?? null) as unknown;
  }, [cartCtx?.items, cartCtx?.cartItems, cartCtx?.cart]);

  useEffect(() => {
    try {
      if (!ctxItems) return;

      if (Array.isArray(ctxItems)) {
        const mapped: Row[] = ctxItems
          .map((it: any) => {
            const p = it?.product ?? it;
            const qty = it?.qty ?? it?.quantity ?? 1;
            const id = p?.id ?? it?.id ?? it?.productId;
            if (!id) return null;

            return {
              type: "cart",
              id: String(id),
              title: String(p?.title ?? it?.title ?? "Produto"),
              price: Number(p?.price ?? it?.price ?? 0),
              oldPrice: p?.oldPrice ? Number(p.oldPrice) : undefined,
              qty: Math.max(1, Number(qty ?? 1)),
              image: p?.image ?? it?.image,
            } as Row;
          })
          .filter(Boolean) as Row[];

        if (mapped.length) setLocalRows(mapped);
      }
    } catch (e: any) {
      if (isFlagEnabled("ff_cart_analytics_v1")) {
        track("cart_rows_map_fail", { message: String(e?.message ?? e) });
      }
    }
  }, [ctxItems]);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    setSelected((prev) => {
      const next: Record<string, boolean> = {};
      for (const r of localRows) next[r.id] = prev[r.id] ?? true;
      return next;
    });
  }, [localRows]);

  const allSelected = useMemo(() => {
    if (!localRows.length) return false;
    return localRows.every((r) => selected[r.id]);
  }, [localRows, selected]);

  const anySelected = useMemo(
    () => localRows.some((r) => selected[r.id]),
    [localRows, selected],
  );

  const selectedSubtotal = useMemo(() => {
    return localRows.reduce((acc, r) => {
      if (!selected[r.id]) return acc;
      return acc + r.price * r.qty;
    }, 0);
  }, [localRows, selected]);

  const selectedSavings = useMemo(() => {
    if (!cartUxUpgrade) return 0;

    return localRows.reduce((acc, r) => {
      if (!selected[r.id]) return acc;
      if (!r.oldPrice) return acc;
      return acc + (r.oldPrice - r.price) * r.qty;
    }, 0);
  }, [localRows, selected, cartUxUpgrade]);

  const freeShippingTarget = 199;
  const freeShippingRemaining = Math.max(0, freeShippingTarget - selectedSubtotal);

  const toProduct = useCallback((row: Row): Product => {
    const p = (products as Product[]).find((x) => x.id === row.id);
    return (
      p ?? {
        id: row.id,
        title: row.title,
        price: row.price,
        category: "",
        image: row.image ?? "",
      }
    );
  }, []);

  const safeAdd = useCallback(
    (product: Product) => {
      const any = cartCtx as any;
      const fn =
        any?.addItem?.bind(any) ||
        any?.add?.bind(any) ||
        any?.addToCart?.bind(any) ||
        any?.increase?.bind(any) ||
        any?.increment?.bind(any);

      withActionLock(`inc:${product.id}`, () => {
        if (isFlagEnabled("ff_cart_analytics_v1")) {
          track("cart_item_increment", { item_id: String(product.id), delta: 1 });
        }

        if (fn) return fn(product, 1);

        setLocalRows((prev) =>
          prev.map((r) => (r.id === product.id ? { ...r, qty: r.qty + 1 } : r)),
        );
      });
    },
    [cartCtx, withActionLock],
  );

  const safeDec = useCallback(
    (product: Product) => {
      const any = cartCtx as any;
      const fn =
        any?.decItem?.bind(any) ||
        any?.decrease?.bind(any) ||
        any?.dec?.bind(any) ||
        any?.decrement?.bind(any) ||
        any?.removeOne?.bind(any);

      withActionLock(`dec:${product.id}`, () => {
        if (isFlagEnabled("ff_cart_analytics_v1")) {
          track("cart_item_decrement", { item_id: String(product.id), delta: 1 });
        }

        if (fn) return fn(product, 1);

        setLocalRows((prev) =>
          prev
            .map((r) =>
              r.id === product.id ? { ...r, qty: Math.max(1, r.qty - 1) } : r,
            )
            .filter((r) => r.qty > 0),
        );
      });
    },
    [cartCtx, withActionLock],
  );

  const safeRemove = useCallback(
    (product: Product) => {
      const any = cartCtx as any;
      const fn =
        any?.removeItem?.bind(any) ||
        any?.remove?.bind(any) ||
        any?.removeFromCart?.bind(any) ||
        any?.deleteItem?.bind(any) ||
        any?.clearItem?.bind(any);

      withActionLock(`rm:${product.id}`, () => {
        if (isFlagEnabled("ff_cart_analytics_v1")) {
          track("cart_item_remove", { item_id: String(product.id) });
        }

        if (fn) return fn(product.id);

        setLocalRows((prev) => prev.filter((r) => r.id !== product.id));
      });
    },
    [cartCtx, withActionLock],
  );

  const sections: CartSection[] = useMemo(
    () => [{ title: "Produtos", data: localRows }],
    [localRows],
  );

  const toggleRow = useCallback((id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelected((prev) => {
      const next: Record<string, boolean> = { ...prev };
      for (const r of localRows) next[r.id] = true;
      return next;
    });
    if (isFlagEnabled("ff_cart_analytics_v1")) track("cart_select_all");
  }, [localRows]);

  const handleClearSelection = useCallback(() => {
    setSelected((prev) => {
      const next: Record<string, boolean> = { ...prev };
      for (const r of localRows) next[r.id] = false;
      return next;
    });
    if (isFlagEnabled("ff_cart_analytics_v1")) track("cart_clear_selection");
  }, [localRows]);

  const handleToggleEdit = useCallback(() => {
    const next = !editMode;
    setEditMode(next);
    if (isFlagEnabled("ff_cart_analytics_v1")) {
      track("cart_toggle_edit_mode", { next });
    }
  }, [editMode]);

  const handleProceed = useCallback(() => {
    const selectedCount = localRows.filter((r) => selected[r.id]).length;

    if (isFlagEnabled("ff_cart_analytics_v1")) {
      track("cart_proceed_tap", {
        selected_count: selectedCount,
        subtotal: selectedSubtotal,
      });
    }

    startCheckout({
      source: "cart",
      subtotal: selectedSubtotal,
      items_count: selectedCount,
    });
  }, [localRows, selected, selectedSubtotal]);

  const ListHeader = useMemo(() => {
    if (!uiV2) return null;

    return (
      <View style={styles.headerWrap}>
        <View style={styles.banner}>
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.bannerTitle, { fontFamily: FONT_BODY_BOLD }]}>
              Frete grátis acima de {formatCurrency(freeShippingTarget)}
            </ThemedText>
            <ThemedText style={[styles.bannerSub, { fontFamily: FONT_BODY }]}>
              {freeShippingRemaining === 0
                ? "Você desbloqueou frete grátis"
                : `Faltam ${formatCurrency(freeShippingRemaining)} para desbloquear`}
            </ThemedText>
            <ProgressBar value={selectedSubtotal} max={freeShippingTarget} />
          </View>
        </View>

        <View style={styles.controlsRow}>
          <View style={styles.controlsLeft}>
            <SmallChip
              label={allSelected ? "Tudo selecionado" : "Selecionar tudo"}
              onPress={handleSelectAll}
            />
            <SmallChip label="Limpar" onPress={handleClearSelection} />
          </View>
          <View style={styles.controlsRight}>
            <SmallChip
              label={editMode ? "Concluir" : "Editar"}
              onPress={handleToggleEdit}
            />
          </View>
        </View>
      </View>
    );
  }, [
    uiV2,
    freeShippingTarget,
    freeShippingRemaining,
    selectedSubtotal,
    allSelected,
    editMode,
    handleSelectAll,
    handleClearSelection,
    handleToggleEdit,
  ]);

  const EmptyState = useMemo(() => {
    return (
      <View style={styles.empty}>
        <ThemedText style={[styles.emptyTitle, { fontFamily: FONT_BODY_BOLD }]}>
          Seu carrinho está vazio
        </ThemedText>
        <ThemedText style={[styles.emptySub, { fontFamily: FONT_BODY }]}>
          Explore produtos e adicione itens para continuar.
        </ThemedText>
        <PrimaryButton
          label="Explorar produtos"
          onPress={() => {
            try {
              router.push("/explore" as any);
            } catch {
              try {
                router.push("/(tabs)/explore" as any);
              } catch {}
            }
          }}
        />
      </View>
    );
  }, []);

  const StickyFooter = useMemo(() => {
    if (!uiV2) return null;

    return (
      <View style={styles.stickyFooter}>
        <View style={styles.footerLeft}>
          <ThemedText style={[styles.footerLabel, { fontFamily: FONT_BODY }]}>
            Subtotal
          </ThemedText>
          <ThemedText style={[styles.footerValue, { fontFamily: FONT_BODY_BOLD }]}>
            {formatCurrency(selectedSubtotal)}
          </ThemedText>

          {cartUxUpgrade && selectedSavings > 0 ? (
            <ThemedText
              style={{
                fontSize: 12,
                color: SUCCESS,
                fontFamily: FONT_BODY_BOLD,
              }}
            >
              Você economiza {formatCurrency(selectedSavings)}
            </ThemedText>
          ) : null}

          <ThemedText style={[styles.footerHint, { fontFamily: FONT_BODY }]}>
            {anySelected ? "Itens selecionados" : "Selecione itens para continuar"}
          </ThemedText>
        </View>
        <View style={styles.footerRight}>
          <PrimaryButton
            label={anySelected ? "Continuar" : "Selecione itens"}
            disabled={!anySelected}
            onPress={handleProceed}
          />
        </View>
      </View>
    );
  }, [uiV2, selectedSubtotal, cartUxUpgrade, selectedSavings, anySelected, handleProceed]);

  const renderRowLegacy = useCallback(
    ({ item }: ListRenderItemInfo<Row>) => {
      const checked = !!selected[item.id];
      const product = toProduct(item);

      return (
        <View style={styles.legacyCard}>
          <View style={styles.legacyRowTop}>
            <Pressable
              onPress={() => toggleRow(item.id)}
              hitSlop={10}
              style={[
                styles.legacyCheck,
                checked ? styles.legacyCheckOn : styles.legacyCheckOff,
              ]}
            >
              {checked ? <View style={styles.legacyDot} /> : null}
            </Pressable>

            <ProductThumb image={item.image} />

            <View style={{ flex: 1 }}>
              <ThemedText
                style={[styles.legacyTitle, { fontFamily: FONT_BODY_BOLD }]}
                numberOfLines={2}
              >
                {item.title}
              </ThemedText>

              <View style={styles.legacyPriceRow}>
                <ThemedText
                  style={[styles.legacyPrice, { fontFamily: FONT_BODY_BOLD }]}
                >
                  {formatCurrency(item.price)}
                </ThemedText>
                <ThemedText style={[styles.legacyUnit, { fontFamily: FONT_BODY }]}>
                  {" "}
                  / un
                </ThemedText>
              </View>

              {item.oldPrice ? (
                <ThemedText style={[styles.legacyOld, { fontFamily: FONT_BODY }]}>
                  {formatCurrency(item.oldPrice)}
                </ThemedText>
              ) : null}
            </View>
          </View>

          <View style={styles.legacyRowBottom}>
            <Pressable
              onPress={() => safeDec(product)}
              style={styles.legacyQtyBtn}
              hitSlop={10}
            >
              <IconSymbolDefault name="minus" size={16} color={theme.colors.text} />
            </Pressable>

            <View style={styles.legacyQtyPill}>
              <ThemedText
                style={[styles.legacyQtyText, { fontFamily: FONT_BODY_BOLD }]}
              >
                {item.qty}
              </ThemedText>
            </View>

            <Pressable
              onPress={() => safeAdd(product)}
              style={styles.legacyQtyBtn}
              hitSlop={10}
            >
              <IconSymbolDefault name="plus" size={16} color={theme.colors.text} />
            </Pressable>

            <Pressable
              onPress={() => safeRemove(product)}
              style={styles.legacyRemoveBtn}
              hitSlop={10}
            >
              <ThemedText style={[styles.legacyRemove, { fontFamily: FONT_BODY_BOLD }]}>
                Remover
              </ThemedText>
            </Pressable>
          </View>
        </View>
      );
    },
    [selected, toProduct, toggleRow, safeDec, safeAdd, safeRemove],
  );

  const renderRowV2 = useCallback(
    ({ item }: ListRenderItemInfo<Row>) => {
      const checked = !!selected[item.id];
      const product = toProduct(item);

      return (
        <View style={styles.cardV2}>
          <View style={styles.rowTopV2}>
            <Pressable
              onPress={() => toggleRow(item.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              style={[styles.checkV2, checked ? styles.checkOnV2 : styles.checkOffV2]}
            >
              {checked ? (
                <IconSymbolDefault name="check" size={14} color={WHITE} />
              ) : null}
            </Pressable>

            <ProductThumb image={item.image} size={74} />

            <View style={{ flex: 1 }}>
              <ThemedText
                style={[styles.titleV2, { fontFamily: FONT_BODY_BOLD }]}
                numberOfLines={2}
              >
                {item.title}
              </ThemedText>

              <View style={styles.priceRowV2}>
                <ThemedText style={[styles.priceV2, { fontFamily: FONT_BODY_BOLD }]}>
                  {formatCurrency(item.price)}
                </ThemedText>
                <ThemedText style={[styles.unitV2, { fontFamily: FONT_BODY }]}>
                  / un
                </ThemedText>
              </View>

              {item.oldPrice ? (
                <ThemedText
                  style={[styles.oldV2, { fontFamily: FONT_BODY }]}
                  numberOfLines={1}
                >
                  {formatCurrency(item.oldPrice)}
                </ThemedText>
              ) : null}
            </View>
          </View>

          <View style={styles.rowBottomV2}>
            <View style={styles.qtyWrapV2}>
              <Pressable
                onPress={() => safeDec(product)}
                style={styles.qtyBtnV2}
                accessibilityRole="button"
              >
                <IconSymbolDefault name="minus" size={16} color={theme.colors.text} />
              </Pressable>

              <View style={styles.qtyPillV2}>
                <ThemedText style={{ fontFamily: FONT_BODY_BOLD }}>{item.qty}</ThemedText>
              </View>

              <Pressable
                onPress={() => safeAdd(product)}
                style={styles.qtyBtnV2}
                accessibilityRole="button"
              >
                <IconSymbolDefault name="plus" size={16} color={theme.colors.text} />
              </Pressable>
            </View>

            <Pressable
              onPress={() => safeRemove(product)}
              style={({ pressed }) => [styles.removeV2, pressed ? { opacity: 0.85 } : null]}
              accessibilityRole="button"
            >
              <ThemedText style={[styles.removeV2Text, { fontFamily: FONT_BODY_BOLD }]}>
                Remover
              </ThemedText>
            </Pressable>
          </View>
        </View>
      );
    },
    [selected, toProduct, toggleRow, safeDec, safeAdd, safeRemove],
  );

  const keyExtractor = useCallback((i: Row) => i.id, []);

  const listFooter = useMemo(() => {
    return (
      <View>
        <RecommendationsCrossSell
          enabled={crossSellV1}
          cartItemIds={localRows.map((r) => r.id)}
          onAdd={(p) => safeAdd(p)}
        />
        <View style={{ height: 140 }} />
      </View>
    );
  }, [crossSellV1, localRows, safeAdd]);

  return (
    <ThemedView style={styles.container}>
      <AppHeader title="Carrinho" />

      {localRows.length === 0 ? (
        EmptyState
      ) : (
        <View style={{ flex: 1 }}>
          <SectionList
            sections={sections}
            keyExtractor={keyExtractor}
            renderItem={uiV2 ? renderRowV2 : renderRowLegacy}
            renderSectionHeader={() => null}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={uiV2 ? styles.listContentV2 : styles.listContentLegacy}
            ListHeaderComponent={ListHeader}
            stickySectionHeadersEnabled={false}
            ListFooterComponent={listFooter}
            // ===== Performance pass =====
            removeClippedSubviews
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            updateCellsBatchingPeriod={40}
            windowSize={7}
          />
          {StickyFooter}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  listContentLegacy: { paddingHorizontal: 14, paddingBottom: 140, paddingTop: 12 },

  legacyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },

  legacyRowTop: { flexDirection: "row", alignItems: "center", gap: 10 },

  legacyCheck: {
    width: 22,
    height: 22,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  legacyCheckOn: { backgroundColor: SUCCESS },
  legacyCheckOff: { borderWidth: 1, borderColor: theme.colors.divider },
  legacyDot: { width: 10, height: 10, borderRadius: 4, backgroundColor: WHITE },

  itemImage: { alignItems: "center", justifyContent: "center" },
  itemImagePlaceholder: {
    borderRadius: 12,
    backgroundColor: theme.colors.divider,
    opacity: 0.25,
  },

  legacyTitle: { fontSize: 13, lineHeight: 18, color: theme.colors.text },
  legacyPriceRow: { flexDirection: "row", alignItems: "baseline" },
  legacyPrice: { fontSize: 14, color: theme.colors.text },
  legacyUnit: { fontSize: 12, opacity: 0.8, color: theme.colors.text },
  legacyOld: {
    fontSize: 12,
    textDecorationLine: "line-through",
    opacity: 0.65,
    color: theme.colors.text,
  },

  legacyRowBottom: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  legacyQtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  legacyQtyPill: {
    minWidth: 44,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  legacyQtyText: { fontSize: 13, color: theme.colors.text },

  legacyRemoveBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  legacyRemove: { fontSize: 12, color: DANGER },

  // ===== V2 =====
  listContentV2: { paddingHorizontal: 14, paddingBottom: 140, paddingTop: 12 },

  headerWrap: { marginBottom: 12 },

  banner: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  bannerTitle: { fontSize: 13, color: theme.colors.text, marginBottom: 4 },
  bannerSub: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 10 },

  progressOuter: {
    height: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    overflow: "hidden",
  },
  progressInner: {
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
  },

  controlsRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  controlsLeft: { flexDirection: "row", gap: 10 },
  controlsRight: { flexDirection: "row", gap: 10 },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  chipText: { fontSize: 12, color: theme.colors.text },

  cardV2: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },

  rowTopV2: { flexDirection: "row", alignItems: "center", gap: 10 },

  checkV2: {
    width: 24,
    height: 24,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOnV2: { backgroundColor: SUCCESS },
  checkOffV2: {
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: "transparent",
  },

  titleV2: { fontSize: 13, lineHeight: 18, color: theme.colors.text },
  priceRowV2: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 4,
  },
  priceV2: { fontSize: 14, color: theme.colors.text },
  unitV2: { fontSize: 12, opacity: 0.8, color: theme.colors.text },
  oldV2: {
    fontSize: 12,
    textDecorationLine: "line-through",
    opacity: 0.65,
    color: theme.colors.text,
  },

  rowBottomV2: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  qtyWrapV2: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtnV2: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  qtyPillV2: {
    minWidth: 44,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },

  removeV2: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surfaceAlt,
  },
  removeV2Text: { fontSize: 12, color: DANGER },

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
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  footerLeft: { flex: 1 },
  footerRight: { width: 160 },
  footerLabel: { fontSize: 12, color: theme.colors.textMuted },
  footerValue: { fontSize: 16, color: theme.colors.text },
  footerHint: { fontSize: 12, color: theme.colors.textMuted },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyTitle: { fontSize: 18, color: theme.colors.text, marginBottom: 6 },
  emptySub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 14,
    textAlign: "center",
  },

  primaryBtn: {
    marginTop: 4,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 12, fontFamily: FONT_BODY_BOLD },

  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnPressed: { opacity: 0.9 },

  crossSellCard: {
    width: 160,
    marginRight: 10,
    borderRadius: 16,
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },

  hint: { marginTop: 12, fontSize: 12, fontFamily: FONT_BODY, opacity: 0.75 },
});