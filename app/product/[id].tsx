import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { products } from "../../constants/products";
import theme, { Radius, Spacing } from "../../constants/theme";

export default function ProductDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pid = String(id ?? "");
  const product = products.find((p) => p.id === pid);

  if (!product) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ThemedView style={{ flex: 1, padding: Spacing.lg, gap: Spacing.md }}>
          <ThemedText type="title">Produto não encontrado</ThemedText>
          <ThemedText style={{ opacity: 0.7 }}>ID: {pid || "(vazio)"}</ThemedText>

          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ThemedText type="defaultSemiBold">Voltar</ThemedText>
          </Pressable>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xl }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ThemedText type="defaultSemiBold">← Voltar</ThemedText>
          </Pressable>
          <ThemedText style={{ opacity: 0.8 }}>{product.category}</ThemedText>
        </View>

        <ThemedView style={styles.card}>
          <View style={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: 6 }}>
            <ThemedText type="title" numberOfLines={2}>
              {product.name}
            </ThemedText>
            {product.badge ? (
              <ThemedText style={{ fontSize: 12, color: theme.colors.primary }}>
                {product.badge}
              </ThemedText>
            ) : null}
          </View>

          <Image source={product.image} contentFit="cover" transition={150} style={styles.image} />

          <View style={{ padding: Spacing.lg, gap: 10 }}>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 18 }}>
              R$ {product.price.toFixed(2)}
            </ThemedText>
            <ThemedText style={{ opacity: 0.9 }}>{product.description}</ThemedText>
          </View>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  card: {
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  image: {
    width: "100%",
    height: 260,
    backgroundColor: theme.colors.surfaceAlt,
    marginTop: Spacing.md,
  },
});
