import { Image } from "expo-image";
import { Link } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import ParallaxScrollView from "../../components/parallax-scroll-view";
import { ProductCard } from "../../components/product-card";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { categories, products } from "../../constants/products";
import { useColorScheme } from "../../hooks/use-color-scheme";

// fail-safe + outbox flush
import { useOutboxAutoFlush } from "../../hooks/useOutboxAutoFlush";

export default function HomeScreen() {
  // retoma checkout se existir draft pendente

  // tenta enviar fila quando abrir o app
  useOutboxAutoFlush();

  const colorScheme = useColorScheme() ?? "light";
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<(typeof categories)[number]>("Todos");

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

  return (
    <>
      {/* âœ… iPhone: horas/bateria brancas sobre o banner */}
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
      >
        <ThemedView style={styles.titleContainer}>
          {/* âœ… nome correto, sem acento */}
          <ThemedText type="title">PLUGAISHOP</ThemedText>
          <ThemedText type="defaultSemiBold">
            SoluÃ§Ãµes curadas para acelerar a operaÃ§Ã£o e o varejo inteligente.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.heroCard}>
          <View style={{ flex: 1, gap: 8 }}>
            <ThemedText type="subtitle">Kit rÃ¡pido de vitrine</ThemedText>
            <ThemedText>
              Combine iluminaÃ§Ã£o, organizaÃ§Ã£o e sinalizaÃ§Ã£o para deixar seu ponto de
              venda pronto em minutos.
            </ThemedText>

            <Link href="/explore" asChild>
              <Pressable style={styles.cta}>
                <ThemedText type="defaultSemiBold">Ver recomendaÃ§Ãµes</ThemedText>
              </Pressable>
            </Link>
          </View>

          {/* âœ… Remove o â€œbanner miniaturaâ€ repetido:
              em vez de usar o mesmo banner-home aqui, usamos o banner-splash */}
          <Image
            source={require("../../assets/banners/banner-splash.png")}
            style={styles.heroImage}
            contentFit="cover"
          />
        </ThemedView>

        <ThemedView style={styles.searchSection}>
          <ThemedText type="subtitle">CatÃ¡logo PlugaiShop</ThemedText>
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
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipRow}
          >
            {categories.map((category) => {
              const isSelected = selectedCategory === category;

              return (
                <Pressable
                  key={category}
                  onPress={() => setSelectedCategory(category)}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                >
                  <ThemedText style={isSelected ? styles.chipSelectedText : undefined}>
                    {category}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </ThemedView>

        <View style={styles.grid}>
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}

          {filteredProducts.length === 0 ? (
            <ThemedText>NÃ£o encontramos itens para sua busca.</ThemedText>
          ) : null}
        </View>

        <ThemedView style={styles.tip}>
          <ThemedText type="defaultSemiBold">Dica de uso</ThemedText>
          <ThemedText>
            {`Use o botÃ£o abaixo para testar aÃ§Ãµes rÃ¡pidas e visualizar a navegaÃ§Ã£o com opÃ§Ãµes contextuais.`}
          </ThemedText>

          <Link href="/modal">
            <Link.Trigger>
              <ThemedText type="link">Abrir menu de aÃ§Ãµes</ThemedText>
            </Link.Trigger>
            <Link.Preview />
            <Link.Menu>
              <Link.MenuAction
                title="Solicitar demo"
                icon="cube"
                onPress={() => alert("Demo")}
              />
              <Link.MenuAction
                title="Compartilhar"
                icon="square.and.arrow.up"
                onPress={() => alert("Link copiado")}
              />
              <Link.Menu title="Mais" icon="ellipsis">
                <Link.MenuAction
                  title="Remover"
                  icon="trash"
                  destructive
                  onPress={() => alert("Item removido")}
                />
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

  cta: {
    marginTop: 8,
    backgroundColor: "#0a7ea4",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },

  searchSection: {
    gap: 12,
    marginTop: 16,
  },

  searchInput: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },

  chipRow: {
    flexGrow: 0,
  },

  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#CBD5E1",
    marginRight: 8,
  },

  chipSelected: {
    backgroundColor: "#0a7ea4",
    borderColor: "#0a7ea4",
  },

  chipSelectedText: {
    color: "#fff",
  },

  grid: {
    marginTop: 16,
    gap: 12,
  },

  tip: {
    gap: 8,
    marginTop: 16,
  },

  // âœ… Banner do Parallax: ocupa tudo (sem â€œquadradoâ€)
  headerBanner: {
    width: "100%",
    height: "100%",
  },
});
