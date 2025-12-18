import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppHeader from "../../components/AppHeader";
import ProductCard from "../../components/ProductCard";
import IconSymbol from "../../components/ui/icon-symbol";
import { CATEGORIES } from "../../constants/categories";
import { PRODUCTS } from "../../constants/products";
import theme from "../../constants/theme";
import { formatCurrencyBRL } from "../../utils/formatCurrency";

type FilterKey = "tudo" | "ofertas" | "lancamentos" | "destaques";

export default function ExploreScreen() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterKey>("tudo");

  const handleBack = () => {
    try {
      router.back();
    } catch {
      router.replace("/(tabs)/index" as any);
    }
  };

  const filteredProducts = useMemo(() => {
    const text = q.trim().toLowerCase();
    let list = PRODUCTS;

    if (filter === "ofertas") {
      list = list.filter(
        (p) => !!p.oldPrice || String(p.badge ?? "").includes("OFERTA")
      );
    }
    if (filter === "lancamentos") {
      list = list.filter((p) => String(p.badge ?? "").includes("LANÇAMENTO"));
    }
    if (filter === "destaques") {
      list = list.filter(
        (p) =>
          String(p.badge ?? "").includes("DESTAQUE") ||
          String(p.badge ?? "").includes("QUERIDINHO")
      );
    }
    if (!text) return list;
    return list.filter((p) => p.name.toLowerCase().includes(text));
  }, [q, filter]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner reto (edge-to-edge) + VOLTAR acima do banner */}
        <View style={styles.bannerWrapper}>
          <Image
            source={require("../../assets/banners/banner-home.png")}
            style={styles.banner}
            resizeMode="cover"
          />

          <Pressable onPress={handleBack} style={styles.backOverlay} hitSlop={12}>
            <IconSymbol name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <AppHeader
          title="Explorar"
          subtitle="Busque novidades, ofertas e produtos para toda a família."
        />

        {/* Busca */}
        <View style={styles.searchWrap}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Buscar por produto, marca ou categoria..."
            placeholderTextColor={theme.colors.textMuted}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>

        {/* Filtros */}
        <View style={styles.filtersRow}>
          <Chip label="Tudo" active={filter === "tudo"} onPress={() => setFilter("tudo")} />
          <Chip label="Ofertas" active={filter === "ofertas"} onPress={() => setFilter("ofertas")} />
          <Chip label="Lançamentos" active={filter === "lancamentos"} onPress={() => setFilter("lancamentos")} />
          <Chip label="Destaques" active={filter === "destaques"} onPress={() => setFilter("destaques")} />
        </View>

        {/* Categorias */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Categorias principais</Text>
            <Pressable onPress={() => router.push("/(tabs)/categories" as any)} hitSlop={10}>
              <Text style={styles.sectionAction}>Ver todas</Text>
            </Pressable>
          </View>

          <FlatList
            data={CATEGORIES}
            keyExtractor={(item) => item.slug}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.catRow}
            contentContainerStyle={styles.catGrid}
            renderItem={({ item }) => {
              const titleRaw = String(item.name ?? "").trim();
              const isSingleWord = titleRaw.length > 0 && !titleRaw.includes(" ");

              return (
                <Pressable
                  onPress={() => router.push(`/(tabs)/category/${item.slug}` as any)}
                  style={styles.catCard}
                >
                  <View style={styles.catTextWrap}>
                    <Text
                      style={styles.catTitle}
                      numberOfLines={isSingleWord ? 1 : 2}
                      ellipsizeMode="clip"
                      adjustsFontSizeToFit={isSingleWord}
                      minimumFontScale={isSingleWord ? 0.82 : 1}
                    >
                      {titleRaw}
                    </Text>

                    <Text
                      style={styles.catHint}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                      ellipsizeMode="clip"
                    >
                      {item.highlight ?? item.description}
                    </Text>
                  </View>
                </Pressable>
              );
            }}
          />
        </View>

        {/* Produtos */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Descobertas para você</Text>
            <Pressable onPress={() => setFilter("tudo")} hitSlop={10}>
              <Text style={styles.sectionAction}>Explorar</Text>
            </Pressable>
          </View>

          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={{ gap: theme.spacing.md }}
            renderItem={({ item }) => (
              <ProductCard
                title={item.name}
                price={formatCurrencyBRL(item.price)}
                oldPrice={item.oldPrice ? formatCurrencyBRL(item.oldPrice) : undefined}
                badge={item.badge}
                installmentText={item.installments}
                onPress={() => router.push(`/(tabs)/product/${item.id}` as any)}
                style={styles.productFull}
              />
            )}
          />
        </View>

        <View style={{ height: theme.spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active ? styles.chipActive : null]}>
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  container: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },

  bannerWrapper: {
    marginHorizontal: -theme.spacing.lg,
    marginTop: 4,
    marginBottom: theme.spacing.lg,
    position: "relative",
  },
  banner: { width: "100%", height: 180 },

  // VOLTAR acima do banner (não fica atrás)
  backOverlay: {
    position: "absolute",
    top: -8,
    left: 12,
    zIndex: 999,
    elevation: 12,
    padding: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.textPrimary,
  },

  searchWrap: { marginTop: theme.spacing.sm, marginBottom: theme.spacing.md },
  searchInput: {
    height: 46,
    borderRadius: 999,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    color: theme.colors.textPrimary,
    ...theme.typography.body,
  },

  filtersRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm, marginBottom: theme.spacing.xl },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  chipActive: { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary },
  chipText: { ...theme.typography.caption, fontWeight: "800", color: theme.colors.textSecondary },
  chipTextActive: { color: theme.colors.primary },

  section: { marginBottom: theme.spacing.xl },
  sectionRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: theme.spacing.sm },
  sectionTitle: { ...theme.typography.sectionTitle, color: theme.colors.textPrimary },
  sectionAction: { ...theme.typography.bodyStrong, color: theme.colors.primary },

  catGrid: { paddingTop: theme.spacing.sm },
  catRow: { justifyContent: "space-between", marginBottom: theme.spacing.md },
  catCard: {
    width: "48%",
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: theme.spacing.md,
    minHeight: 96,
    justifyContent: "flex-start",
    ...theme.shadows.card,
  },
  catTextWrap: { width: "100%" },
  catTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.textPrimary,
    includeFontPadding: false,
    textAlign: "center",
  },
  catHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 6,
    includeFontPadding: false,
    textAlign: "center",
  },

  productFull: { width: "100%" },
});
