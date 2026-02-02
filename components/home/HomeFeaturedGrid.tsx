// components/home/HomeFeaturedGrid.tsx
import { router } from "expo-router";
import { memo, useEffect, useMemo } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { products } from "../../data/catalog";
import { formatCurrency } from "../../utils/formatCurrency";

type ProductLike = {
  id: string | number;
  title?: string;
  price?: number;
  image?: string;
};

type Props = {
  title: string;
  onClickProduct?: (p: ProductLike) => void;
  onFail?: (msg: string, code?: string) => void;
  onImpression?: () => void;
};

function n(v: unknown) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function HomeFeaturedGridBase({ title, onClickProduct, onFail, onImpression }: Props) {
  useEffect(() => {
    onImpression?.();
  }, [onImpression]);

  const items = useMemo(() => {
    try {
      return (products ?? [])
        .slice(0, 8)
        .map((p: any) => ({
          id: String(p?.id ?? ""),
          title: String(p?.title ?? "Produto"),
          price: n(p?.price),
          image: String(p?.image ?? ""),
        })) as ProductLike[];
    } catch {
      onFail?.("Falha ao carregar destaques", "HOME_GRID_PARSE");
      return [] as ProductLike[];
    }
  }, [onFail]);

  if (!items.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        numColumns={2}
        scrollEnabled={false}
        columnWrapperStyle={styles.cols}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => {
              onClickProduct?.(item);
              router.push(`/product/${String(item.id)}`);
            }}
          >
            <View style={styles.imageWrap}>
              {!!item.image ? <Image source={{ uri: item.image }} style={styles.image} /> : null}
            </View>
            <Text numberOfLines={2} style={styles.name}>
              {item.title}
            </Text>
            <Text style={styles.price}>{formatCurrency(n(item.price))}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

export default memo(HomeFeaturedGridBase);

const styles = StyleSheet.create({
  wrap: { marginTop: 2 },
  title: { color: "#fff", fontSize: 13, fontWeight: "800", marginBottom: 8, opacity: 0.9 },
  cols: { gap: 10, marginBottom: 10 },
  card: {
    flex: 1,
    backgroundColor: "#131313",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1F1F1F",
    padding: 10,
  },
  imageWrap: { width: "100%", height: 110, borderRadius: 12, backgroundColor: "#0B0B0B", overflow: "hidden" },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  name: { color: "#fff", fontSize: 12, fontWeight: "700", marginTop: 8, opacity: 0.92 },
  price: { color: "#fff", fontSize: 12, fontWeight: "800", marginTop: 6, opacity: 0.9 },
});
