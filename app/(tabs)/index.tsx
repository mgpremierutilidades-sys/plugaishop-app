import { Image } from "expo-image";
import { Link, router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import ParallaxScrollView, {
  PARALLAX_CONTENT_PADDING,
  PARALLAX_HEADER_HEIGHT,
} from "../../components/parallax-scroll-view";
import { ProductCard } from "../../components/product-card";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { FeatureFlags, getFeatureFlag } from "../../constants/featureFlags";
import type { Product } from "../../data/catalog";
import { products } from "../../data/catalog";
import { useColorScheme } from "../../hooks/use-color-scheme";

// fail-safe + outbox flush
import { useOutboxAutoFlush } from "../../hooks/useOutboxAutoFlush";
import {
  isHomeScrollOptimizedEnabled,
  trackHomeBlockImpression,
  trackHomeFail,
  trackHomePerf,
  trackHomeProductClick,
  trackHomeScrollDepth,
  trackHomeView,
} from "../../utils/homeAnalytics";

const ALL = "Todos" as const;

type BlockId = "title" | "hero" | "search" | "grid" | "tip";

type BlockLayout = { y: number; height: number };

export default function HomeScreen() {
  useOutboxAutoFlush();

  const { height: viewportHeight } = useWindowDimensions();

  // anti-duplicação (React Strict Mode / foco rápido)
  const lastViewTsRef = useRef(0);
  const lastClickByProductRef = useRef<Record<string, number>>({});

  // Etapa 2 — estado de scroll/impressões (por foco)
  const contentHeightRef = useRef(0);
  const firedDepthRef = useRef<Record<number, boolean>>({});
  const firedBlocksRef = useRef<Record<string, boolean>>({});
  const blockLayoutsRef = useRef<Partial<Record<BlockId, BlockLayout>>>({});

  // Etapa 3 — flags/perf (sem alterar UI)
  const perfV3EnabledRef = useRef(false);
  const scrollV3EnabledRef = useRef(false);
  const lastScrollYRef = useRef(0);
  const rafPendingRef = useRef(false);

  const colorScheme = useColorScheme() ?? "light";
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastViewTsRef.current < 800) return;
      lastViewTsRef.current = now;

      // reset por foco (Etapa 2)
      firedDepthRef.current = {};
      firedBlocksRef.current = {};

      // Etapa 3 — carrega flags (ref-only, sem re-render)
      void getFeatureFlag(FeatureFlags.HOME_PERF_V3)
        .then((v) => {
          perfV3EnabledRef.current = v;
        })
        .catch(() => {
          perfV3EnabledRef.current = false;
        });

      void isHomeScrollOptimizedEnabled()
        .then((v) => {
          scrollV3EnabledRef.current = v;
        })
        .catch(() => {
          scrollV3EnabledRef.current = false;
        });

      void trackHomeView().catch(() => {
        // no-op
      });
    }, [])
  );

  const onSelectCategory = useCallback((category: string) => {
    setSelectedCategory(category);
  }, []);

  const onOpenProduct = useCallback((productId: string, position?: number) => {
    const now = Date.now();
    const last = lastClickByProductRef.current[productId] ?? 0;
    if (now - last < 500) return;
    lastClickByProductRef.current[productId] = now;

    void trackHomeProductClick({ productId, position }).catch(() => {
      // no-op
    });

    try {
      router.push(`/product/${productId}` as any);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      void trackHomeFail({ scope: "home_action", message: msg.slice(0, 120) }).catch(() => {
        // no-op
      });
    }
  }, []);

  const categories = useMemo(() => {
    try {
      const set = new Set<string>();
      for (const p of products as Product[]) {
        if (p?.category) set.add(String(p.category));
      }
      return [ALL, ...Array.from(set)];
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      void trackHomeFail({ scope: "home_render", message: msg.slice(0, 120) }).catch(() => {
        // no-op
      });
      return [ALL];
    }
  }, []);

  const filteredProducts = useMemo(() => {
    try {
      const normalizedQuery = query.trim().toLowerCase();

      return (products as Product[]).filter((product) => {
        const matchesCategory = selectedCategory === ALL || product.category === selectedCategory;

        const title = String(product.title ?? "").toLowerCase();
        const desc = String(product.description ?? "").toLowerCase();

        const matchesQuery =
          normalizedQuery.length === 0 || title.includes(normalizedQuery) || desc.includes(normalizedQuery);

        return matchesCategory && matchesQuery;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      void trackHomeFail({ scope: "home_render", message: msg.slice(0, 120) }).catch(() => {
        // no-op
      });
      return [] as Product[];
    }
  }, [query, selectedCategory]);

  const onContentSizeChange = useCallback((_w: number, h: number) => {
    contentHeightRef.current = h;
  }, []);

  const onBlockLayout = useCallback((id: BlockId) => {
    return (e: LayoutChangeEvent) => {
      const { y, height } = e.nativeEvent.layout;
      blockLayoutsRef.current[id] = { y, height };
    };
  }, []);

  const blockOnLayouts = useMemo(() => {
    return {
      title: onBlockLayout("title"),
      hero: onBlockLayout("hero"),
      search: onBlockLayout("search"),
      grid: onBlockLayout("grid"),
      tip: onBlockLayout("tip"),
    } as const;
  }, [onBlockLayout]);

  const maybeFireDepth = useCallback(
    (scrollY: number) => {
      const contentH = contentHeightRef.current;
      if (!contentH || contentH <= 0) return;

      // Percentual do conteúdo já “alcançado” no viewport
      const reached = ((scrollY + viewportHeight) / contentH) * 100;
      const thresholds = [25, 50, 75, 100] as const;

      for (const t of thresholds) {
        if (reached >= t && !firedDepthRef.current[t]) {
          firedDepthRef.current[t] = true;
          void trackHomeScrollDepth(t).catch(() => {
            // no-op
          });
        }
      }
    },
    [viewportHeight]
  );

  const maybeFireImpressions = useCallback(
    (scrollY: number) => {
      // Visível no scroll
      const visibleTop = scrollY;
      const visibleBottom = scrollY + viewportHeight;

      const MIN_VISIBLE_PX = 20;

      const layouts = blockLayoutsRef.current;

      (Object.keys(layouts) as BlockId[]).forEach((id) => {
        const l = layouts[id];
        if (!l) return;
        if (firedBlocksRef.current[id]) return;

        // Converter y relativo ao container de conteúdo para y absoluto no ScrollView:
        // [header height] + [padding do conteúdo] + [y do bloco]
        const blockTop = PARALLAX_HEADER_HEIGHT + PARALLAX_CONTENT_PADDING + l.y;
        const blockBottom = blockTop + l.height;

        const isVisible =
          visibleBottom >= blockTop + MIN_VISIBLE_PX && visibleTop <= blockBottom - MIN_VISIBLE_PX;

        if (isVisible) {
          firedBlocksRef.current[id] = true;
          void trackHomeBlockImpression(id).catch(() => {
            // no-op
          });
        }
      });
    },
    [viewportHeight]
  );

  const flushScrollWork = useCallback(() => {
    rafPendingRef.current = false;

    const y = lastScrollYRef.current;

    if (!scrollV3EnabledRef.current) {
      // fallback seguro (caso flag mude durante execução)
      maybeFireDepth(y);
      maybeFireImpressions(y);
      return;
    }

    if (perfV3EnabledRef.current) {
      const start = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
      maybeFireDepth(y);
      maybeFireImpressions(y);
      const end = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();

      void trackHomePerf({ name: "home_scroll_flush", ms: Math.max(0, Math.round(end - start)) }).catch(() => {
        // no-op
      });
      return;
    }

    maybeFireDepth(y);
    maybeFireImpressions(y);
  }, [maybeFireDepth, maybeFireImpressions]);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y ?? 0;

      // Etapa 3 — reduzir trabalho por frame (sem mudar UI):
      // - guarda o último Y
      // - processa 1x por RAF quando flag estiver ON
      if (scrollV3EnabledRef.current) {
        lastScrollYRef.current = y;

        if (!rafPendingRef.current) {
          rafPendingRef.current = true;
          requestAnimationFrame(flushScrollWork);
        }
        return;
      }

      // Etapa 2 (baseline)
      maybeFireDepth(y);
      maybeFireImpressions(y);
    },
    [flushScrollWork, maybeFireDepth, maybeFireImpressions]
  );

  return (
    <>
      <StatusBar style="light" />

      <ParallaxScrollView
        headerBackgroundColor={{ light: "#0E1720", dark: "#0E1720" }}
        headerImage={
          <Image
            source={require("../../assets/banners/banner-home.png")}
            style={styles.headerBanner}
            contentFit="cover"
          />
        }
        scrollViewProps={{
          onScroll,
          onContentSizeChange,
          scrollEventThrottle: 16,
        }}
      >
        <ThemedView collapsable={false} onLayout={blockOnLayouts.title} style={styles.titleContainer}>
          <ThemedText type="title">Economize Mais</ThemedText>
          <ThemedText type="defaultSemiBold">
            Soluções curadas para acelerar a operação e o varejo inteligente.
          </ThemedText>
        </ThemedView>

        <ThemedView collapsable={false} onLayout={blockOnLayouts.hero} style={styles.heroCard}>
          <View style={{ flex: 1, gap: 8 }}>
            <ThemedText type="subtitle">Kit rápido de vitrine</ThemedText>
            <ThemedText>
              Combine iluminação, organização e sinalização para deixar seu ponto de venda pronto em minutos.
            </ThemedText>

            <Link href="/explore" asChild>
              <Pressable style={styles.cta}>
                <ThemedText type="defaultSemiBold">Ver recomendações</ThemedText>
              </Pressable>
            </Link>
          </View>

          <Image
            source={require("../../assets/banners/banner-splash.png")}
            style={styles.heroImage}
            contentFit="cover"
          />
        </ThemedView>

        <ThemedView collapsable={false} onLayout={blockOnLayouts.search} style={styles.searchSection}>
          <ThemedText type="subtitle">Catálogo Plugaishop</ThemedText>

          <TextInput
            placeholder="Buscar por categoria ou produto"
            placeholderTextColor={colorScheme === "light" ? "#6B7280" : "#9CA3AF"}
            value={query}
            onChangeText={setQuery}
            style={[
              styles.searchInput,
              {
                backgroundColor: colorScheme === "light" ? "#F3F4F6" : "#111315",
                borderColor: colorScheme === "light" ? "#E5E7EB" : "#2A2F38",
                color: colorScheme === "light" ? "#111827" : "#F9FAFB",
              },
            ]}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {categories.map((category) => {
              const isSelected = selectedCategory === category;

              return (
                <Pressable
                  key={category}
                  onPress={() => onSelectCategory(category)}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                >
                  <ThemedText style={isSelected ? styles.chipSelectedText : undefined}>{category}</ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </ThemedView>

        <View collapsable={false} onLayout={blockOnLayouts.grid} style={styles.grid}>
          {filteredProducts.map((product, idx) => (
            <ProductCard key={product.id} product={product} position={idx} onPressProduct={onOpenProduct} />
          ))}

          {filteredProducts.length === 0 ? <ThemedText>Não encontramos itens para sua busca.</ThemedText> : null}
        </View>

        <ThemedView collapsable={false} onLayout={blockOnLayouts.tip} style={styles.tip}>
          <ThemedText type="defaultSemiBold">Dica de uso</ThemedText>
          <ThemedText>
            {`Use o botão abaixo para testar ações rápidas e visualizar a navegação com opções contextuais.`}
          </ThemedText>

          <Link href="/modal">
            <Link.Trigger>
              <ThemedText type="link">Abrir menu de ações</ThemedText>
            </Link.Trigger>
            <Link.Preview />
            <Link.Menu>
              <Link.MenuAction title="Solicitar demo" icon="cube" onPress={() => alert("Demo")} />
              <Link.MenuAction title="Compartilhar" icon="square.and.arrow.up" onPress={() => alert("Link copiado")} />
              <Link.Menu title="Mais" icon="ellipsis">
                <Link.MenuAction title="Remover" icon="trash" destructive onPress={() => alert("Item removido")} />
              </Link.Menu>
            </Link.Menu>
          </Link>
        </ThemedView>
      </ParallaxScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    gap: 8,
    marginBottom: 12,
  },

  heroCard: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: "#E6F4FE",
    padding: 16,
    borderRadius: 16,
  },

  heroImage: {
    width: 96,
    height: 96,
    borderRadius: 18,
    backgroundColor: "#0E1720",
  },

  headerBanner: {
    width: "100%",
    height: PARALLAX_HEADER_HEIGHT,
  },

  cta: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#0E1720",
    alignSelf: "flex-start",
  },

  searchSection: {
    marginTop: 14,
    gap: 10,
  },

  searchInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },

  chipRow: {
    marginTop: 4,
  },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8,
  },

  chipSelected: {
    backgroundColor: "#0E1720",
    borderColor: "#0E1720",
  },

  chipSelectedText: {
    color: "#FFFFFF",
  },

  grid: {
    marginTop: 18,
    gap: 14,
  },

  tip: {
    marginTop: 18,
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },
});
