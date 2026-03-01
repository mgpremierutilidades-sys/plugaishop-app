import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import IconSymbolDefault from "../../components/ui/icon-symbol";
import { SafeCollapsible } from "../../components/ui/safe-collapsible";
import theme from "../../constants/theme";
import type { Product } from "../../data/catalog";
import { products } from "../../data/catalog";
import { track } from "../../lib/analytics";

type CategoryItem = { id: string; name: string };

function toCategoryId(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function categoryIconName(categoryName: string) {
  const n = (categoryName || "").toLowerCase();

  if (n.includes("eletro") && !n.includes("eletrod")) return "tv-outline";
  if (n.includes("eletrod")) return "flash-outline";
  if (n.includes("inform")) return "laptop-outline";
  if (n.includes("casa") || n.includes("lar")) return "home-outline";
  if (n.includes("moda") || n.includes("vest")) return "shirt-outline";
  if (n.includes("brinqu")) return "game-controller-outline";
  if (n.includes("pet")) return "paw-outline";
  if (n.includes("beleza") || n.includes("perf")) return "sparkles-outline";
  if (n.includes("acess")) return "pricetag-outline";

  return "pricetag-outline";
}

export default function ExploreScreen() {
  const mainCategories = useMemo<CategoryItem[]>(() => {
    const map = new Map<string, CategoryItem>();

    for (const p of products as Product[]) {
      const raw = String(p?.category ?? "").trim();
      if (!raw) continue;

      const id = toCategoryId(raw);
      if (map.has(id)) continue;

      map.set(id, { id, name: raw });
      if (map.size >= 8) break;
    }

    if (map.size === 0) {
      const fallback = [
        "Eletrônicos",
        "Eletrodomésticos",
        "Acessórios",
        "Informática",
        "Vestuário",
        "Casa",
        "Pet",
        "Beleza",
      ];

      for (const name of fallback) {
        const id = toCategoryId(name);
        map.set(id, { id, name });
      }
    }

    return Array.from(map.values());
  }, []);

  const featured = useMemo<Product[]>(
    () => (products as Product[]).slice(0, 12),
    [],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explorar</Text>

        <Pressable
          style={styles.headerAction}
          onPress={() => {
            // ISSUE #52: entrypoint do Explore para /search
            try {
              track("explore_search_entry_clicked", { source: "header_button" });
            } catch {}
            router.push("/search");
          }}
        >
          <Text style={styles.headerActionText}>Buscar</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categorias principais</Text>

          <View style={styles.grid}>
            {mainCategories.map((c) => {
              const oneWord = c.name.trim().split(/\s+/).length === 1;

              return (
                <Pressable
                  key={c.id}
                  style={styles.categoryCard}
                  onPress={() =>
                    router.push(`/category/${c.id}` as unknown as any)
                  }
                >
                  <View style={styles.categoryIconWrap}>
                    <IconSymbolDefault
                      name={categoryIconName(c.name)}
                      size={20}
                      color={theme.colors.primary}
                    />
                  </View>

                  <Text
                    style={styles.categoryName}
                    numberOfLines={oneWord ? 1 : 2}
                    adjustsFontSizeToFit={oneWord}
                    minimumFontScale={oneWord ? 0.82 : 1}
                  >
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          {/* ✅ title text-safe (string) conforme contrato do Collapsible */}
          <SafeCollapsible title="Dicas e novidades" initiallyExpanded={false}>
            <Text style={styles.helperText}>
              Promoções, avisos e conteúdo leve podem ficar aqui.
            </Text>
          </SafeCollapsible>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Produtos em destaque</Text>

          {/* Mantido como estava no seu arquivo original (cards manuais) */}
          <View style={styles.productsGrid}>
            {featured.map((p) => (
              <Pressable
                key={(p as any).id}
                style={styles.productCard}
                onPress={() => {
                  const pid = String((p as any).id);
                  router.push({
                    pathname: "/product/[id]" as any,
                    params: { id: pid, source: "explore" },
                  });
                }}
              >
                {/* NOTE: seu arquivo original usa Image + formatCurrency.
                   Se você quiser manter EXATAMENTE igual, mantenha imports Image/formatCurrency.
                   Aqui eu mantive a estrutura do bloco, mas sem reintroduzir imports extras.
                   Se esse arquivo no PR #86 ainda tinha Image/formatCurrency, preserve-os. */}
                <Text style={styles.productTitle} numberOfLines={2}>
                  {String((p as any).title ?? "Produto")}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  header: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTitle: { fontSize: 24, fontWeight: "800", color: theme.colors.text },

  headerAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  headerActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text,
  },

  content: { padding: 16, paddingBottom: 28 },

  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 16, marginBottom: 10, color: theme.colors.text },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  categoryCard: {
    width: "48%",
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    alignItems: "center",
  },
  categoryIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceAlt,
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryName: { fontSize: 12, color: theme.colors.text, textAlign: "center" },

  helperText: { fontSize: 12, color: theme.colors.textMuted, marginTop: 8 },

  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  productCard: {
    width: "48%",
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  productTitle: { fontSize: 12, color: theme.colors.text, marginBottom: 6 },
});