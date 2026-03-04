// app/(tabs)/index.tsx
import { Link, router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProductCard } from "../../components/product-card";
import { categories, products } from "../../constants/products";
import { track } from "../../lib/analytics";

// fail-safe + outbox flush
import { useCheckoutFailSafe } from "../../hooks/useCheckoutFailSafe";
import { useOutboxAutoFlush } from "../../hooks/useOutboxAutoFlush";

type QuickAction = { id: string; label: string; emoji: string; bg: string; route: string };
type Dept = { id: string; label: string; emoji: string };

export default function HomeScreen() {
  useCheckoutFailSafe();
  useOutboxAutoFlush();

  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<(typeof categories)[number]>("Todos");

  const didRedirectRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      didRedirectRef.current = false;
      return () => {};
    }, []),
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === "Todos" || product.category === selectedCategory;

      const matchesQuery =
        normalizedQuery.length === 0 ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.description.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [query, selectedCategory]);

  // “meio banner” azul fixo
  const BLUE_HEADER_H = 190;

  // mock (substituir por store real)
  const buyerAddress = "Rua Exemplo, 123 • Centro • Curitiba-PR";

  const quickActions: QuickAction[] = useMemo(
    () => [
      { id: "flash", label: "Relâmpagos", emoji: "⚡", bg: "#FFE7BA", route: "/explore" },
      { id: "offers", label: "Ofertas", emoji: "🔥", bg: "#FFD6D6", route: "/explore" },
      { id: "deals", label: "Descontos", emoji: "💸", bg: "#D7F8E4", route: "/explore" },
      { id: "coupons", label: "Cupons", emoji: "🏷️", bg: "#DDEBFF", route: "/explore" },
      { id: "official", label: "Oficiais", emoji: "✅", bg: "#E9D7FF", route: "/explore" },
      { id: "shipping", label: "Frete", emoji: "🚚", bg: "#D7F3FF", route: "/explore" },
    ],
    [],
  );

  const departments: Dept[] = useMemo(
    () => [
      { id: "eletronicos", label: "Eletrônicos", emoji: "📱" },
      { id: "casa", label: "Casa", emoji: "🏠" },
      { id: "cozinha", label: "Cozinha", emoji: "🍳" },
      { id: "beleza", label: "Beleza", emoji: "💄" },
      { id: "ferramentas", label: "Ferramentas", emoji: "🧰" },
      { id: "pets", label: "Pets", emoji: "🐾" },
      { id: "moda", label: "Moda", emoji: "👕" },
      { id: "esportes", label: "Esportes", emoji: "🏀" },
      { id: "infantil", label: "Infantil", emoji: "🧸" },
      { id: "automotivo", label: "Auto", emoji: "🚗" },
      { id: "jardim", label: "Jardim", emoji: "🌿" },
      { id: "iluminacao", label: "Iluminação", emoji: "💡" },
    ],
    [],
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      {/* Header azul FIXO (fica preso ao subir) */}
      <View
        style={[
          styles.blueHeader,
          {
            paddingTop: insets.top + 10,
            height: BLUE_HEADER_H + insets.top,
          },
        ]}
      >
        <View style={styles.blueHeaderInner}>
          <Pressable
            style={styles.addressRow}
            onPress={() => track("home_address_click")}
            accessibilityRole="button"
          >
            <Text style={styles.addressLabel}>Entregar em</Text>
            <Text style={styles.addressValue} numberOfLines={1}>
              {buyerAddress}
            </Text>
          </Pressable>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.deptRow}
          >
            {departments.map((d) => (
              <Pressable
                key={d.id}
                style={styles.deptPill}
                onPress={() => {
                  track("home_department_click", { id: d.id, label: d.label });
                  router.push("/explore");
                }}
                accessibilityRole="button"
              >
                <View style={styles.deptIcon}>
                  <Text style={styles.deptEmoji}>{d.emoji}</Text>
                </View>
                <Text style={styles.deptLabel} numberOfLines={1}>
                  {d.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Conteúdo scrollável (passa “por baixo” do header fixo) */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: BLUE_HEADER_H + 12,
          paddingBottom: 24 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Busca branca com letras pretas */}
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔎</Text>
          <TextInput
            placeholder="Buscar por categoria ou produto"
            placeholderTextColor="#0B1220"
            value={query}
            onChangeText={setQuery}
            onFocus={() => {
              if (didRedirectRef.current) return;
              didRedirectRef.current = true;

              track("home_search_focused", { source: "home_search_input" });
              router.push("/search");
            }}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>

        {/* Atalhos (ícones redondos) */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitleSmall}>Atalhos</Text>
            <Text style={styles.sectionMetaSmall}>Toque para explorar</Text>
          </View>

          <View style={styles.quickGrid}>
            {quickActions.map((a) => (
              <Pressable
                key={a.id}
                style={styles.quickItem}
                onPress={() => {
                  track("home_quick_action_click", { id: a.id, label: a.label });
                  router.push(a.route);
                }}
                accessibilityRole="button"
              >
                <View style={[styles.quickIcon, { backgroundColor: a.bg }]}>
                  <Text style={styles.quickEmoji}>{a.emoji}</Text>
                </View>
                <Text style={styles.quickLabel} numberOfLines={2}>
                  {a.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Chips categorias */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {categories.map((category) => {
            const isSelected = selectedCategory === category;

            return (
              <Pressable
                key={category}
                onPress={() => setSelectedCategory(category)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? "#0A7EA4" : "#FFFFFF",
                    borderColor: isSelected ? "#0A7EA4" : "#E2E8F0",
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Categoria ${category}`}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: isSelected ? "#FFFFFF" : "#0B1220" },
                  ]}
                >
                  {category}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Hero (claro) */}
        <View style={[styles.hero, { backgroundColor: "#F3F7FF", borderColor: "#D6E4FF" }]}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[styles.heroTitle, { color: "#0B1220" }]}>
              Kit rápido de vitrine
            </Text>
            <Text style={[styles.heroDesc, { color: "#334155" }]}>
              Organização, sinalização e iluminação para vender mais com menos esforço.
            </Text>

            <View style={styles.heroActions}>
              <Link href="/explore" asChild>
                <Pressable style={styles.btnPrimary} accessibilityRole="button">
                  <Text style={styles.btnPrimaryText}>Ver recomendações</Text>
                </Pressable>
              </Link>

              <Link href="/cart" asChild>
                <Pressable style={styles.btnGhost} accessibilityRole="button">
                  <Text style={styles.btnGhostText}>Ir ao carrinho</Text>
                </Pressable>
              </Link>
            </View>
          </View>

          <View style={styles.heroNeutralBox} />
        </View>

        {/* Catálogo */}
        <View style={styles.catalogHeader}>
          <Text style={styles.sectionTitle}>Catálogo</Text>
          <Text style={styles.sectionMeta}>{filteredProducts.length} itens</Text>
        </View>

        <View style={styles.grid}>
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} source="home" />
          ))}

          {filteredProducts.length === 0 ? (
            <Text style={styles.empty}>Não encontramos itens para sua busca.</Text>
          ) : null}
        </View>

        <View style={{ height: 12 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  scroll: { flex: 1 },

  // HEADER AZUL FIXO
  blueHeader: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 20,
    backgroundColor: "#0A7EA4",
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    overflow: "hidden",
  },
  blueHeaderInner: {
    paddingHorizontal: 14,
    gap: 12,
  },
  addressRow: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addressLabel: { color: "#FFFFFF", fontSize: 10, fontWeight: "900", opacity: 0.95 },
  addressValue: { color: "#FFFFFF", fontSize: 11, fontWeight: "800", marginTop: 4 },

  deptRow: { gap: 10, paddingBottom: 12 },
  deptPill: { width: 72, alignItems: "center", gap: 6 },
  deptIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.40)",
  },
  deptEmoji: { fontSize: 18 },
  deptLabel: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },

  // Busca branca com letras pretas
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    height: 44,
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    marginHorizontal: 14,
  },
  searchIcon: { fontSize: 14, marginRight: 8, opacity: 0.9 },
  searchInput: { flex: 1, fontSize: 12, paddingVertical: 8, color: "#0B1220" },

  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 14,
    marginTop: 12,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitleSmall: { fontSize: 12, fontWeight: "900", color: "#0B1220" },
  sectionMetaSmall: { fontSize: 11, fontWeight: "700", color: "#64748B" },

  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickItem: { width: "30%", minWidth: 92, alignItems: "center", gap: 6, paddingVertical: 6 },
  quickIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(16,24,40,0.08)",
  },
  quickEmoji: { fontSize: 20 },
  quickLabel: { textAlign: "center", fontSize: 10, fontWeight: "800", color: "#0B1220", lineHeight: 13 },

  chipsRow: { paddingVertical: 10, paddingHorizontal: 14, gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  chipText: { fontSize: 11, fontWeight: "800" },

  hero: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginHorizontal: 14,
  },
  heroTitle: { fontSize: 14, fontWeight: "900", letterSpacing: -0.2 },
  heroDesc: { fontSize: 11, lineHeight: 15 },

  heroActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },

  btnPrimary: {
    backgroundColor: "#0A7EA4",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  btnPrimaryText: { color: "#FFFFFF", fontWeight: "900", fontSize: 12 },

  btnGhost: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(148,163,184,0.15)",
  },
  btnGhostText: { color: "#0B1220", fontWeight: "900", fontSize: 12 },

  heroNeutralBox: {
    width: 74,
    height: 74,
    borderRadius: 18,
    backgroundColor: "rgba(148,163,184,0.25)",
  },

  catalogHeader: {
    marginTop: 14,
    marginBottom: 6,
    marginHorizontal: 14,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },

  sectionTitle: { fontSize: 16, fontWeight: "900", letterSpacing: -0.2, color: "#0B1220" },
  sectionMeta: { fontSize: 11, fontWeight: "700", color: "#64748B" },

  grid: { marginTop: 10, gap: 12, paddingHorizontal: 14 },

  empty: { marginTop: 10, fontSize: 11, fontWeight: "700", color: "#64748B" },
});