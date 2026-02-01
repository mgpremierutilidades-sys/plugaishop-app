import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import HomeBannerStrip from "../../components/home/HomeBannerStrip";
import HomeGrid from "../../components/home/HomeGrid";
import HomeHeroCarousel from "../../components/home/HomeHeroCarousel";
import HomeQuickChips from "../../components/home/HomeQuickChips";
import HomeSectionHeader from "../../components/home/HomeSectionHeader";
import HomeSkeleton from "../../components/home/HomeSkeleton";
import HomeTrustRow from "../../components/home/HomeTrustRow";
import ParallaxScrollView from "../../components/ParallaxScrollView";
import { ProductCard } from "../../components/product-card";
import { FeatureFlags, getFeatureFlag } from "../../constants/featureFlags";
import { products } from "../../data/catalog";
import {
  trackHomeBlockImpression,
  trackHomeCategorySelect,
  trackHomeFail,
  trackHomeProductClick,
  trackHomeScrollDepth,
  trackHomeSearch,
  trackHomeStateRestore,
  trackHomeView,
} from "../../utils/homeAnalytics";

const ALL_CATEGORY = "Todas";
const HOME_FILTERS_KEY = "home:filters:v1";

export default function HomeScreen() {
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORY);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [homeFF, setHomeFF] = useState({ debounce: true, persist: true });

  const restoringRef = useRef(false);
  const lastTrackedSearchRef = useRef<string>("");
  const lastTrackedCategoryRef = useRef<string>(ALL_CATEGORY);

  const scrollYRef = useRef(0);
  const lastDepthBucketRef = useRef(0);
  const impressionsRef = useRef(new Set<string>());

  // evita usar "query stale" quando as flags carregam depois do usuário digitar
  const queryRef = useRef(query);
  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.category) set.add(p.category);
    }
    return [ALL_CATEGORY, ...Array.from(set).sort()];
  }, []);

  useFocusEffect(
    useCallback(() => {
      void trackHomeView().catch(() => {});
      return () => {};
    }, [])
  );

  useEffect(() => {
    let mounted = true;

    Promise.all([
      getFeatureFlag(FeatureFlags.HOME_SEARCH_DEBOUNCE_V1),
      getFeatureFlag(FeatureFlags.HOME_PERSIST_FILTERS_V1),
    ])
      .then(([debounce, persist]) => {
        if (!mounted) return;
        setHomeFF({ debounce, persist });

        // Se debounce estiver OFF, sincroniza com a query atual (não do first render)
        if (!debounce) setDebouncedQuery(queryRef.current);
      })
      .catch(() => {
        // Mantém defaults.
      });

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!homeFF.debounce) {
      setDebouncedQuery(query);
      return;
    }
    const t = setTimeout(() => setDebouncedQuery(query), 180);
    return () => clearTimeout(t);
  }, [homeFF.debounce, query]);

  useEffect(() => {
    if (!homeFF.persist) return;

    let active = true;
    restoringRef.current = true;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(HOME_FILTERS_KEY);
        if (!active) return;

        if (raw) {
          const parsed = JSON.parse(raw) as { query?: string; category?: string } | null;
          if (parsed?.query) setQuery(String(parsed.query));
          if (parsed?.category) setSelectedCategory(String(parsed.category));
          await trackHomeStateRestore({ restored: true });
        } else {
          await trackHomeStateRestore({ restored: false });
        }
      } catch {
        // ignore
      } finally {
        restoringRef.current = false;
      }
    })();

    return () => {
      active = false;
      restoringRef.current = false;
    };
  }, [homeFF.persist]);

  useEffect(() => {
    if (!homeFF.persist) return;
    if (restoringRef.current) return;

    const t = setTimeout(() => {
      void AsyncStorage.setItem(HOME_FILTERS_KEY, JSON.stringify({ query, category: selectedCategory })).catch(
        () => {}
      );
    }, 250);

    return () => clearTimeout(t);
  }, [homeFF.persist, query, selectedCategory]);

  useEffect(() => {
    if (restoringRef.current) return;

    const q = debouncedQuery.trim();
    if (q.length > 0 && q !== lastTrackedSearchRef.current) {
      lastTrackedSearchRef.current = q;
      void trackHomeSearch({ queryLen: q.length, hasCategory: selectedCategory !== ALL_CATEGORY }).catch(() => {});
    }
  }, [debouncedQuery, selectedCategory]);

  useEffect(() => {
    if (restoringRef.current) return;

    if (selectedCategory !== lastTrackedCategoryRef.current) {
      lastTrackedCategoryRef.current = selectedCategory;
      void trackHomeCategorySelect({ category: selectedCategory }).catch(() => {});
    }
  }, [selectedCategory]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = debouncedQuery.trim().toLowerCase();

    return products.filter((p) => {
      if (selectedCategory !== ALL_CATEGORY && p.category !== selectedCategory) return false;
      if (!normalizedQuery) return true;
      const hay = `${p.title} ${p.description ?? ""}`.toLowerCase();
      return hay.includes(normalizedQuery);
    });
  }, [debouncedQuery, selectedCategory]);

  const onOpenProduct = useCallback((productId: string, position?: number) => {
    void trackHomeProductClick({ productId, position }).catch(() => {});
    router.push({ pathname: "/product/[id]", params: { id: productId } });
  }, []);

  const onCategory = useCallback((cat: string) => {
    setSelectedCategory(cat);
  }, []);

  const onScroll = useCallback((y: number, contentH: number, viewportH: number) => {
    scrollYRef.current = y;

    const denom = Math.max(1, contentH - viewportH);
    const pct = Math.max(0, Math.min(100, Math.round((y / denom) * 100)));

    const bucket = pct >= 100 ? 100 : pct >= 75 ? 75 : pct >= 50 ? 50 : pct >= 25 ? 25 : 0;

    if (bucket > lastDepthBucketRef.current) {
      lastDepthBucketRef.current = bucket;
      void trackHomeScrollDepth(bucket).catch(() => {});
    }
  }, []);

  const impressionOnce = useCallback((blockId: string) => {
    if (impressionsRef.current.has(blockId)) return;
    impressionsRef.current.add(blockId);
    void trackHomeBlockImpression(blockId).catch(() => {});
  }, []);

  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  const onRetry = useCallback(() => {
    setLoading(true);
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(() => setLoading(false), 450);
  }, []);

  const onFailSafe = useCallback((message: string, code?: string) => {
    void trackHomeFail({ scope: "home_action", message, code }).catch(() => {});
  }, []);

  if (loading) return <HomeSkeleton />;

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#0B0B0B", dark: "#0B0B0B" }}
      headerImage={<View style={{ height: 0 }} />}
      onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = e.nativeEvent.contentOffset.y;
        const contentH = e.nativeEvent.contentSize.height;
        const viewportH = e.nativeEvent.layoutMeasurement.height;
        onScroll(y, contentH, viewportH);
      }}
      scrollEventThrottle={16}
    >
      <View style={styles.container}>
        <HomeHeroCarousel onImpression={() => impressionOnce("hero")} />
        <HomeBannerStrip onImpression={() => impressionOnce("banner_strip")} />
        <HomeTrustRow onImpression={() => impressionOnce("trust_row")} />

        <HomeSectionHeader title="Buscar" subtitle="Encontre produtos rapidamente" />
        <View style={styles.searchBox}>
          <TextInput
            placeholder="Buscar produtos..."
            placeholderTextColor="#6B6B6B"
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        <HomeSectionHeader title="Categorias" subtitle="Explore por categoria" />
        <HomeQuickChips
          items={categories}
          selected={selectedCategory}
          onSelect={onCategory}
          onImpression={() => impressionOnce("categories")}
        />

        <HomeSectionHeader title="Vitrine" subtitle="Seleção do dia" />
        <HomeGrid onImpression={() => impressionOnce("grid")} />

        <HomeSectionHeader title="Produtos" subtitle="Baseado na sua busca" />
        <View style={styles.productsWrap}>
          {filteredProducts.map((p, idx) => (
            <ProductCard key={p.id} product={p} onPress={() => onOpenProduct(p.id, idx)} />
          ))}
        </View>

        <View style={styles.footerActions}>
          <TouchableOpacity style={styles.ghostBtn} onPress={onRetry}>
            <Text style={styles.ghostBtnText}>Recarregar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => onFailSafe("cta_home_debug")}>
            <Text style={styles.ghostBtnText}>Debug</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 16,
  },
  searchBox: {
    backgroundColor: "#121212",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#1F1F1F",
  },
  searchInput: {
    color: "#fff",
    fontSize: 14,
  },
  productsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  footerActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginTop: 8,
  },
  ghostBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#1F1F1F",
  },
  ghostBtnText: {
    color: "#EAEAEA",
    fontWeight: "700",
  },
});
