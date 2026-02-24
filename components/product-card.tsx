import { Image } from "expo-image";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { isFlagEnabled } from "@/constants/flags";
import { Product } from "@/constants/products";
import { useThemeColor } from "@/hooks/use-theme-color";

type ProductCardProps = {
  product: Product;
  source?: "home" | "explore" | "unknown";
};

function formatBRL(value: number) {
  const fixed = value.toFixed(2).replace(".", ",");
  return `R$ ${fixed}`;
}

export function ProductCard({ product, source = "unknown" }: ProductCardProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const cardBg = useThemeColor(
    { light: "#FFFFFF", dark: "#111315" },
    "background",
  );
  const border = useThemeColor(
    { light: "#E5E7EB", dark: "#2A2F38" },
    "background",
  );
  const imageBg = useThemeColor(
    { light: "#F1F5F9", dark: "#0B0D10" },
    "background",
  );

  const accent = useThemeColor({ light: "#0a7ea4", dark: "#7AC4FF" }, "tint");
  const muted = useThemeColor(
    { light: "rgba(15,23,42,0.62)", dark: "rgba(226,232,240,0.70)" },
    "text",
  );

  const initials = useMemo(() => {
    const s = (product.name || "").trim();
    if (!s) return "•";
    const parts = s.split(/\s+/).slice(0, 2);
    return parts.map((p: string) => p[0]?.toUpperCase()).join("");
  }, [product.name]);

  function handleOpen() {
    if (!isFlagEnabled("ff_pdp_v1")) return;

    const id = String((product as any)?.id ?? "");
    if (!id) return;

    router.push({
      pathname: "/product/[id]" as any,
      params: { id, source },
    } as any);
  }

  return (
    <Pressable onPress={handleOpen} style={({ pressed }) => pressed ? { opacity: 0.96 } : null}>
      <ThemedView
        style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}
      >
        <View style={styles.topRow}>
          <ThemedText type="caption" style={[styles.category, { color: muted }]}>
            {product.category}
          </ThemedText>

          {(product as any).badge ? (
            <ThemedText type="caption" style={[styles.badge, { color: accent }]}>
              {(product as any).badge}
            </ThemedText>
          ) : (
            <View style={{ width: 1 }} />
          )}
        </View>

        <View style={[styles.imageWrap, { backgroundColor: imageBg }]}>
          {!imgFailed ? (
            <Image
              source={(product as any).image}
              contentFit="cover"
              transition={120}
              style={styles.image}
              accessibilityLabel={product.name}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <View style={styles.fallback}>
              <View style={[styles.fallbackBadge, { borderColor: border }]}>
                <ThemedText
                  type="defaultSemiBold"
                  style={[styles.fallbackText, { color: muted }]}
                >
                  {initials}
                </ThemedText>
              </View>
              <ThemedText
                type="caption"
                style={[styles.fallbackHint, { color: muted }]}
              >
                Imagem indisponível
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.info}>
          <ThemedText
            type="defaultSemiBold"
            style={styles.title}
            numberOfLines={2}
          >
            {product.name}
          </ThemedText>

          <ThemedText
            type="caption"
            style={[styles.desc, { color: muted }]}
            numberOfLines={2}
          >
            {product.description}
          </ThemedText>
        </View>

        <View style={styles.footer}>
          <ThemedText type="defaultSemiBold" style={styles.price}>
            {formatBRL(product.price)}
          </ThemedText>

          <ThemedText type="caption" style={[styles.link, { color: accent }]}>
            Ver detalhes
          </ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingTop: 10,
    gap: 8,
  },

  category: {
    fontWeight: "500",
    flex: 1,
  },

  badge: {
    fontWeight: "600",
  },

  imageWrap: {
    marginTop: 8,
    width: "100%",
    height: 118,
    overflow: "hidden",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  fallbackBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  fallbackText: {
    fontSize: 14,
    fontWeight: "600",
  },

  fallbackHint: {
    fontWeight: "400",
  },

  info: {
    paddingHorizontal: 10,
    paddingTop: 10,
    gap: 4,
  },

  title: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.1,
  },

  desc: {
    lineHeight: 16,
    fontWeight: "400",
  },

  footer: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 10,
  },

  price: {
    fontSize: 13,
    fontWeight: "600",
  },

  link: {
    fontWeight: "600",
  },
});