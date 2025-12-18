import { Stack, router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ButtonPrimary from "../../components/ButtonPrimary";
import IconSymbol from "../../components/ui/icon-symbol";
import { PRODUCTS, type Product } from "../../constants/products";
import theme from "../../constants/theme";
import { useCart } from "../../context/CartContext";
import { formatCurrencyBRL } from "../../utils/formatCurrency";

function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const cart = useCart();

  const idSafe = Array.isArray(id) ? id[0] : id;

  const product: Product | undefined = useMemo(
    () => (idSafe ? getProductById(idSafe) : undefined),
    [idSafe]
  );

  const handleBack = () => {
    // back seguro
    try {
      router.back();
    } catch {
      router.replace("/" as any);
    }
  };

  if (!product) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />

        <SafeAreaView style={styles.safeArea}>
          <View style={styles.center}>
            <Text style={styles.title}>Produto não encontrado</Text>
            <Text style={styles.subtitle}>
              Tente voltar e selecionar um produto novamente.
            </Text>

            <View style={{ height: 14 }} />

            <Pressable onPress={handleBack} style={styles.backPill}>
              <IconSymbol
                name="chevron-back"
                size={18}
                color={theme.colors.textPrimary}
              />
              <Text style={styles.backText}>Voltar</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const priceFormatted = formatCurrencyBRL(product.price);
  const oldPriceFormatted = product.oldPrice
    ? formatCurrencyBRL(product.oldPrice)
    : undefined;

  return (
    <>
      {/* Remove QUALQUER header/back automático do Expo Router nesta tela */}
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Área de imagem do produto (placeholder) + VOLTAR ÚNICO sobre a "imagem/banner" */}
          <View style={styles.imageWrapper}>
            <View style={styles.imagePlaceholder} />

            <Pressable
              onPress={handleBack}
              style={styles.backOverlay}
              hitSlop={12}
            >
              <IconSymbol name="chevron-back" size={22} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Título e preços */}
          <View style={styles.section}>
            <Text style={styles.title}>{product.name}</Text>

            <View style={styles.row}>
              <Text style={styles.price}>{priceFormatted}</Text>
              {oldPriceFormatted && (
                <Text style={styles.oldPrice}>{oldPriceFormatted}</Text>
              )}
            </View>

            {product.installments && (
              <Text style={styles.installments}>{product.installments}</Text>
            )}

            {product.badge && (
              <View style={styles.badgeWrapper}>
                <Text style={styles.badgeText}>{product.badge}</Text>
              </View>
            )}
          </View>

          {/* Descrição */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descrição</Text>
            <Text style={styles.description}>
              Este é um produto selecionado pela Plugaí Shop para oferecer o
              melhor custo-benefício para você. Em breve, esta área será
              preenchida automaticamente com a descrição completa do nosso
              catálogo oficial.
            </Text>
          </View>

          {/* Ações */}
          <View style={styles.section}>
            <ButtonPrimary
              title="Adicionar ao carrinho"
              onPress={() => cart.addItem(product.id, 1)}
            />

            <View style={{ height: 10 }} />

            <Pressable
              onPress={() => {
                cart.addItem(product.id, 1);
                router.push("/checkout" as any);
              }}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Comprar agora</Text>
            </Pressable>
          </View>

          <View style={{ height: theme.spacing.xl }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  imageWrapper: {
    marginBottom: theme.spacing.lg,
    position: "relative",
  },
  imagePlaceholder: {
    width: "100%",
    height: 260,
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },

  // VOLTAR ÚNICO (sobre a imagem/banner)
  backOverlay: {
    position: "absolute",
    top: -6, // sobe um pouco acima, como você pediu
    left: 12,
    zIndex: 20,
    padding: 8,
    borderRadius: 999,
    backgroundColor: theme.colors.textPrimary, // discreto e consistente
  },

  section: {
    marginBottom: theme.spacing.lg,
  },

  title: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },

  row: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginBottom: 4,
  },
  price: {
    ...theme.typography.h2,
    color: theme.colors.price,
  },
  oldPrice: {
    ...theme.typography.priceOld,
  },
  installments: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },

  badgeWrapper: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: theme.colors.warning,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    ...theme.typography.badge,
    color: "#111827",
  },

  sectionTitle: {
    ...theme.typography.sectionTitle,
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },

  secondaryButton: {
    height: 48,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  secondaryButtonText: {
    ...theme.typography.buttonLabel,
    color: theme.colors.primary,
  },

  // usado somente no estado "Produto não encontrado"
  backPill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  backText: {
    ...theme.typography.caption,
    fontWeight: "800",
    color: theme.colors.textPrimary,
  },
});
