// components/home/HomeProductRail.tsx
import { router } from "expo-router";
import { memo, useEffect, useMemo } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { products } from "../../data/catalog";
import { formatCurrency } from "../../utils/formatCurrency";

type HomeSort = "relevance" | "price_asc" | "price_desc";

type ProductLike = {
  id: string | number;
  title?: string;
  price?: number;
  image?: string;
  category?: string;
};

type Props = {
  title: string;
  category: string;
  sort: HomeSort;
  search: string;
  cep8?: string;

  onClickProduct?: (p: ProductLike) => void;
  onFail?: (msg: string, code?: string) => void;
  onImpression?: () => void;
};

function n(v: unknown) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function includesCI(hay: string, needle: string) {
  return hay.toLowerCase().includes(needle.toLowerCase());
}

function HomeProductRailBase(props: Props) {
  const { title, category, sort, search, onClickProduct, onFail, onImpression } = props;

  useEffect(() => {
    onImpression?.();
  }, [onImpression]);

  const items = useMemo(() => {
    try {
      const q = String(search ?? "").trim();
      const cat = String(category ?? "all");

      let list = (products ?? []) as any[];

      if (cat && cat !== "all") {
        list = list.filter((p) => String(p?.category ?? "").toLowerCase() === cat.toLowerCase());
      }

      if (q) {
        list = list.filter((p) => includesCI(String(p?.title ?? ""), q));
      }

      if (sort === "price_asc") {
        list = [...list].sort((a, b) => n(a?.price) - n(b?.price));
      } else if (sort === "price_desc") {
        list = [...list].sort((a, b) => n(b?.price) - n(a?.price));
      }

      return list.slice(0, 12).map((p) => ({
        id: String(p?.id ?? ""),
        title: String(p?.title ?? "Produto"),
        price: n(p?.price),
        image: String(p?.image ?? ""),
        category: String(p?.category ?? ""),
      })) as ProductLike[];
    } catch (e: any) {
      onFail?.("Falha ao carregar produtos", "HOME_RAIL_PARSE");
      return [] as ProductLike[];
    }
  }, [category, onFail, search, sort]);

  if (!items.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map((p) => (
          <Pressable
            key={String(p.id)}
            style={styles.card}
            onPress={() => {
              onClickProduct?.(p);
              router.push(`/product/${String(p.id)}`);
            }}
          >
            <View style={styles.imageWrap}>
              {!!p.image ? <Image source={{ uri: p.image }} style={styles.image} /> : null}
            </View>
            <Text numberOfLines={2} style={styles.name}>
              {p.title}
            </Text>
            <Text style={styles.price}>{formatCurrency(n(p.price))}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export default memo(HomeProductRailBase);

const styles = StyleSheet.create({
  wrap: { marginTop: 2 },
  title: { color: "#fff", fontSize: 13, fontWeight: "800", marginBottom: 8, opacity: 0.9 },
  row: { gap: 10, paddingBottom: 2 },
  card: {
    width: 140,
    backgroundColor: "#131313",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1F1F1F",
    padding: 10,
  },
  imageWrap: { width: "100%", height: 92, borderRadius: 12, backgroundColor: "#0B0B0B", overflow: "hidden" },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  name: { color: "#fff", fontSize: 12, fontWeight: "700", marginTop: 8, opacity: 0.92 },
  price: { color: "#fff", fontSize: 12, fontWeight: "800", marginTop: 6, opacity: 0.9 },
});
