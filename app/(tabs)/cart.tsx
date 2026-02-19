import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Pressable,
  SectionList,
  StyleSheet,
  View,
  type ImageSourcePropType,
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

function ProductThumb({ image, size = 72 }: { image?: string; size?: number }) {
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
        <View style={[styles.itemImagePlaceholder, { width: size, height: size }]} />
      )}
    </View>
  );
}

function PrimaryButton({
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
}

function SmallChip({ label, onPress }: { label: string; onPress: () => void }) {
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
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(1, value / max));
  return (
    <View style={styles.progressOuter}>
      <View style={[styles.progressInner, { width: `${Math.round(pct * 100)}%` }]} />
    </View>
  );
}

export default function CartTab() {
  const cartCtx = useCart() as any;

  // TEMP: até adicionarmos no union FeatureFlag corretamente
  const uiV2 = isFlagEnabled("ff_cart_ui_v2");

  const actionLocksRef = useRef<Record<string, number>>({});
  const ACTION_LOCK_MS = 250;

  const withActionLock = useCallback((key: string, fn: () => void) => {
    if (!isFlagEnabled("ff_cart_action_lock")) return fn();

    const now = Date.now();
    const last = actionLocksRef.current[key] ?? 0;

    if (now - last < ACTION_LOCK_MS) {
      if (isFlagEnabled("ff_cart_analytics_v1"))
        track("cart_double_action_prevented", { key });
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

  const anySelected = useMemo(() => localRows.some((r) => selected[r.id]), [localRows, selected]);

  const selectedSubtotal = useMemo(() => {
    return localRows.reduce((acc, r) => {
      if (!selected[r.id]) return acc;
      return acc + r.price * r.qty;
    }, 0);
  }, [localRows, selected]);

  const freeShippingTarget = 199;
  const freeShippingRemaining = Math.max(0, freeShippingTarget - selectedSubtotal);

  function toProduct(row: Row): Product {
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
  }

  function safeAdd(product: Product) {
    const any = cartCtx as any;
    const fn =
      any?.addItem?.bind(any) ||
      any?.add?.bind(any) ||
      any?.addToCart?.bind(any) ||
      any?.increase?.bind(any) ||
      any?.increment?.bind(any);

    withActionLock(`inc:${product.id}`, () => {
      if (isFlagEnabled("ff_cart_analytics_v1"))
        track("cart_item_increment", { item_id: String(product.id), delta: 1 });

      if (fn) return fn(product, 1);

      setLocalRows((prev) =>
        prev.map((r) => (r.id === product.id ? { ...r, qty: r.qty + 1 } : r)),
      );
    });
  }

  function safeDec(product: Product) {
    const any = cartCtx as any;
    const fn =
      any?.decItem?.bind(any) ||
      any?.decrease?.bind(any) ||
      any?.dec?.bind(any) ||
      any?.decrement?.bind(any) ||
      any?.removeOne?.bind(any);

    withActionLock(`dec:${product.id}`, () => {
      if (isFlagEnabled("ff_cart_analytics_v1"))
        track("cart_item_decrement", { item_id: String(product.id), delta: 1 });

      if (fn) return fn(product, 1);

      setLocalRows((prev) =>
        prev
          .map((r) => (r.id === product.id ? { ...r, qty: Math.max(1, r.qty - 1) } : r))
          .filter((r) => r.qty > 0),
      );
    });
  }

  function safeRemove(product: Product) {
    const any = cartCtx as any;
    const fn =
      any?.removeItem?.bind(any) ||
      any?.remove?.bind(any) ||
      any?.removeFromCart?.bind(any) ||
      any?.deleteItem?.bind(any) ||
      any?.clearItem?.bind(any);

    withActionLock(`rm:${product.id}`, () => {
      if (isFlagEnabled("ff_cart_analytics_v1"))
        track("cart_item_remove", { item_id: String(product.id) });

      if (fn) return fn(product.id);

      setLocalRows((prev) => prev.filter((r) => r.id !== product.id));
    });
  }

  const sections: CartSection[] = useMemo(() => [{ title: "Produtos", data: localRows }], [localRows]);

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
    setEditMode((v) => !v);
    if (isFlagEnabled("ff_cart_analytics_v1"))
      track("cart_toggle_edit_mode", { next: !editMode });
  }, [editMode]);

  const handleProceed = useCallback(() => {
    if (isFlagEnabled("ff_cart_analytics_v1")) {
      track("cart_proceed_tap", {
        selected_count: localRows.filter((r) => selected[r.id]).length,
        subtotal: selectedSubtotal,
      });
    }

    try {
      router.push("/checkout" as any);
    } catch {
      try {
        router.push("/(tabs)/checkout" as any);
      } catch {}
    }
  }, [localRows, selected, selectedSubtotal]);

  const renderRowLegacy = ({ item }: { item: Row }) => {
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
              <ThemedText style={[styles.legacyPrice, { fontFamily: FONT_BODY_BOLD }]}>
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
          <Pressable onPress={() => safeDec(product)} style={styles.legacyQtyBtn} hitSlop={10}>
            <IconSymbolDefault name="minus" size={16} color={theme.colors.text} />
          </Pressable>

          <View style={styles.legacyQtyPill}>
            <ThemedText style={[styles.legacyQtyText, { fontFamily: FONT_BODY_BOLD }]}>
              {item.qty}
            </ThemedText>
          </View>

          <Pressable onPress={() => safeAdd(product)} style={styles.legacyQtyBtn} hitSlop={10}>
            <IconSymbolDefault name="plus" size={16} color={theme.colors.text} />
          </Pressable>

          <Pressable onPress={() => safeRemove(product)} style={styles.legacyRemoveBtn} hitSlop={10}>
            <ThemedText style={[styles.legacyRemove, { fontFamily: FONT_BODY_BOLD }]}>
              Remover
            </ThemedText>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderRowV2 = ({ item }: { item: Row }) => {
    const checked = !!selected[item.id];
    const product = toProduct(item);

    const pctOff =
      item.oldPrice && item.oldPrice > 0 && item.oldPrice > item.price
        ? Math.round(((item.oldPrice - item.price) / item.oldPrice) * 100)
        : 0;

    return (
      <View style={styles.card}>
        <Pressable
          accessibilityRole="button"
          onPress={() => toggleRow(item.id)}
          style={({ pressed }) => [styles.cardTopRow, pressed ? { opacity: 0.96 } : null]}
        >
          <View style={styles.checkboxBig}>
            <View style={[styles.checkboxBox, checked && styles.checkboxBoxChecked]}>
              {checked ? <IconSymbolDefault name="check" size={14} color={WHITE} /> : null}
            </View>
          </View>

          <ProductThumb image={item.image} size={76} />

          <View style={styles.cardBody}>
            <ThemedText numberOfLines={2} style={[styles.itemTitle, { fontFamily: FONT_BODY }]}>
              {item.title}
            </ThemedText>

            <ThemedText numberOfLines={1} style={[styles.metaText, { fontFamily: FONT_BODY }]}>
              Cor: Preto • Tamanho: Único
            </ThemedText>

            <View style={styles.priceRow}>
              <ThemedText style={[styles.price, { fontFamily: FONT_BODY_BOLD }]}>
                {formatCurrency(item.price)}
              </ThemedText>
              {item.oldPrice ? (
                <ThemedText style={[styles.oldPrice, { fontFamily: FONT_BODY }]}>
                  {formatCurrency(item.oldPrice)}
                </ThemedText>
              ) : null}
              {pctOff ? (
                <View style={styles.discountPill}>
                  <ThemedText style={[styles.discountText, { fontFamily: FONT_BODY_BOLD }]}>
                    -{pctOff}%
                  </ThemedText>
                </View>
              ) : null}
            </View>
          </View>
        </Pressable>

        <View style={styles.cardBottomRow}>
          <View style={styles.qtyRowV2}>
            <Pressable onPress={() => safeDec(product)} style={styles.qtyBtnV2} accessibilityRole="button">
              <IconSymbolDefault name="minus" size={16} color={theme.colors.text} />
            </Pressable>

            <View style={styles.qtyBoxV2}>
              <ThemedText style={{ fontFamily: FONT_BODY_BOLD }}>{item.qty}</ThemedText>
            </View>

            <Pressable onPress={() => safeAdd(product)} style={styles.qtyBtnV2} accessibilityRole="button">
              <IconSymbolDefault name="plus" size={16} color={theme.colors.text} />
            </Pressable>
          </View>

          {editMode ? (
            <Pressable onPress={() => safeRemove(product)} style={styles.removeBtnV2} accessibilityRole="button">
              <IconSymbolDefault name="trash" size={18} color={WHITE} />
              <ThemedText style={[styles.removeTextV2, { fontFamily: FONT_BODY_BOLD }]}>
                Remover
              </ThemedText>
            </Pressable>
          ) : (
            <View style={styles.inlineGuarantee}>
              <IconSymbolDefault name="shield" size={14} color={theme.colors.textSecondary} />
              <ThemedText style={[styles.metaText, { fontFamily: FONT_BODY }]}>
                Compra protegida
              </ThemedText>
            </View>
          )}
        </View>
      </View>
    );
  };

  const ListHeader = () => {
    if (!uiV2) return null;

    return (
      <View style={styles.topArea}>
        <View style={styles.topActionsRow}>
          {allSelected ? (
            <SmallChip label="Limpar seleção" onPress={handleClearSelection} />
          ) : (
            <SmallChip label="Selecionar tudo" onPress={handleSelectAll} />
          )}
          <View style={{ flex: 1 }} />
          <SmallChip label={editMode ? "Concluir" : "Editar"} onPress={handleToggleEdit} />
        </View>

        <View style={styles.topCard}>
          <View style={styles.topCardRow}>
            <IconSymbolDefault name="map-pin" size={18} color={theme.colors.text} />
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.topCardTitle, { fontFamily: FONT_BODY_BOLD }]}>
                Entregar em
              </ThemedText>
              <ThemedText numberOfLines={1} style={[styles.topCardSubtitle, { fontFamily: FONT_BODY }]}>
                Defina seu endereço para calcular frete
              </ThemedText>
            </View>
            <Pressable
              onPress={() => {
                try {
                  router.push("/addresses" as any);
                } catch {}
              }}
              style={styles.linkBtn}
              accessibilityRole="button"
            >
              <ThemedText style={[styles.linkBtnText, { fontFamily: FONT_BODY_BOLD }]}>
                Alterar
              </ThemedText>
            </Pressable>
          </View>
        </View>

        <View style={styles.topCard}>
          <View style={styles.topCardRow}>
            <IconSymbolDefault name="truck" size={18} color={theme.colors.text} />
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.topCardTitle, { fontFamily: FONT_BODY_BOLD }]}>
                Frete grátis a partir de {formatCurrency(freeShippingTarget)}
              </ThemedText>
              <ThemedText style={[styles.topCardSubtitle, { fontFamily: FONT_BODY }]}>
                {freeShippingRemaining <= 0
                  ? "Você já desbloqueou o frete grátis"
                  : `Faltam ${formatCurrency(freeShippingRemaining)} para liberar`}
              </ThemedText>
              <View style={{ marginTop: 8 }}>
                <ProgressBar value={selectedSubtotal} max={freeShippingTarget} />
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.topCard, styles.topCardPromo]}>
          <View style={styles.topCardRow}>
            <IconSymbolDefault name="ticket" size={18} color={WHITE} />
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.topCardTitle, { fontFamily: FONT_BODY_BOLD, color: WHITE }]}>
                Cupom disponível
              </ThemedText>
              <ThemedText style={[styles.topCardSubtitle, { fontFamily: FONT_BODY, color: WHITE, opacity: 0.92 }]}>
                Aplique no checkout e economize
              </ThemedText>
            </View>
            <IconSymbolDefault name="chevron-right" size={18} color={WHITE} />
          </View>
        </View>

        <ThemedText style={[styles.sectionLabel, { fontFamily: FONT_BODY_BOLD }]}>
          Seus itens
        </ThemedText>
      </View>
    );
  };

  const EmptyState = () => {
    return (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIcon}>
          <IconSymbolDefault name="shopping-cart" size={28} color={theme.colors.textSecondary} />
        </View>
        <ThemedText style={[styles.emptyTitle, { fontFamily: FONT_BODY_BOLD }]}>
          Seu carrinho está vazio
        </ThemedText>
        <ThemedText style={[styles.emptySub, { fontFamily: FONT_BODY }]}>
          Explore ofertas e adicione produtos para começar.
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
  };

  const StickyFooter = () => {
    if (!uiV2) return null;

    return (
      <View style={styles.stickyFooter}>
        <View style={styles.footerLeft}>
          <ThemedText style={[styles.footerLabel, { fontFamily: FONT_BODY }]}>Subtotal</ThemedText>
          <ThemedText style={[styles.footerValue, { fontFamily: FONT_BODY_BOLD }]}>
            {formatCurrency(selectedSubtotal)}
          </ThemedText>
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
  };

  return (
    <ThemedView style={styles.container}>
      <AppHeader title="Carrinho" />

      {localRows.length === 0 ? (
        <EmptyState />
      ) : (
        <View style={{ flex: 1 }}>
          <SectionList
            sections={sections}
            keyExtractor={(i) => i.id}
            renderItem={uiV2 ? renderRowV2 : renderRowLegacy}
            renderSectionHeader={() => null}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={uiV2 ? styles.listContentV2 : styles.listContentLegacy}
            ListHeaderComponent={<ListHeader />}
            stickySectionHeadersEnabled={false}
            ListFooterComponent={<View style={{ height: 140 }} />}
          />
          {uiV2 ? <StickyFooter /> : null}
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

  legacyCheck: { width: 22, height: 22, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  legacyCheckOn: { backgroundColor: SUCCESS },
  legacyCheckOff: { borderWidth: 1, borderColor: theme.colors.divider },
  legacyDot: { width: 10, height: 10, borderRadius: 4, backgroundColor: WHITE },

  itemImage: { alignItems: "center", justifyContent: "center" },
  itemImagePlaceholder: { borderRadius: 12, backgroundColor: theme.colors.divider, opacity: 0.25 },

  legacyTitle: { fontSize: 14, color: theme.colors.text },
  legacyPriceRow: { flexDirection: "row", alignItems: "baseline", marginTop: 6 },
  legacyPrice: { fontSize: 14, color: theme.colors.text },
  legacyUnit: { fontSize: 12, opacity: 0.7, color: theme.colors.textSecondary },
  legacyOld: { fontSize: 12, opacity: 0.55, textDecorationLine: "line-through", marginTop: 2, color: theme.colors.textSecondary },

  legacyRowBottom: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 10 },

  legacyQtyBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: theme.colors.divider, alignItems: "center", justifyContent: "center" },
  legacyQtyPill: { minWidth: 46, height: 34, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.divider, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.background, paddingHorizontal: 10 },
  legacyQtyText: { minWidth: 18, textAlign: "center", color: theme.colors.text },

  legacyRemoveBtn: { marginLeft: "auto", paddingHorizontal: 10, paddingVertical: 8 },
  legacyRemove: { fontSize: 12, opacity: 0.85, color: theme.colors.text },

  listContentV2: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 160 },

  topArea: { paddingTop: 4, paddingBottom: 10, gap: 10 },

  topActionsRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 4 },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  chipText: { fontSize: 12, color: theme.colors.text },

  topCard: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  topCardPromo: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  topCardRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  topCardTitle: { fontSize: 13, color: theme.colors.text },
  topCardSubtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },

  linkBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: theme.colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  linkBtnText: { fontSize: 12, color: theme.colors.text },

  progressOuter: { width: "100%", height: 10, borderRadius: 999, backgroundColor: theme.colors.border, opacity: 0.35, overflow: "hidden" },
  progressInner: { height: 10, borderRadius: 999, backgroundColor: SUCCESS },

  sectionLabel: { fontSize: 14, color: theme.colors.text, paddingHorizontal: 4, marginTop: 4 },

  card: { borderRadius: 18, backgroundColor: theme.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, overflow: "hidden" },
  cardTopRow: { flexDirection: "row", gap: 10, padding: 12, paddingBottom: 10 },

  checkboxBig: { paddingTop: 6, paddingRight: 2 },
  checkboxBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: theme.colors.border, backgroundColor: theme.colors.background, alignItems: "center", justifyContent: "center" },
  checkboxBoxChecked: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary },

  cardBody: { flex: 1, gap: 4 },

  itemTitle: { fontSize: 14, color: theme.colors.text, lineHeight: 18 },
  metaText: { fontSize: 12, color: theme.colors.textSecondary },

  priceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  price: { fontSize: 16, color: theme.colors.text },
  oldPrice: { fontSize: 12, color: theme.colors.textSecondary, textDecorationLine: "line-through" },

  discountPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: SUCCESS },
  discountText: { fontSize: 11, color: WHITE },

  cardBottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingBottom: 12 },

  qtyRowV2: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtnV2: { width: 38, height: 38, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, backgroundColor: theme.colors.background, alignItems: "center", justifyContent: "center" },
  qtyBoxV2: { minWidth: 44, height: 38, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },

  inlineGuarantee: { flexDirection: "row", alignItems: "center", gap: 6 },

  removeBtnV2: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 38, borderRadius: 12, backgroundColor: DANGER },
  removeTextV2: { fontSize: 12, color: WHITE },

  stickyFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    flexDirection: "row",
    gap: 10,
  },

  footerLeft: { flex: 1, justifyContent: "center" },
  footerRight: { width: 160 },

  footerLabel: { fontSize: 12, color: theme.colors.textSecondary },
  footerValue: { fontSize: 18, color: theme.colors.text, marginTop: 2 },
  footerHint: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },

  primaryBtn: { height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.primary },
  primaryBtnPressed: { opacity: 0.92 },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnText: { fontSize: 14, color: WHITE },

  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 10 },
  emptyIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: theme.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 18, color: theme.colors.text, textAlign: "center" },
  emptySub: { fontSize: 13, color: theme.colors.textSecondary, textAlign: "center", marginBottom: 6 },
});
