import { memo, useEffect } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  onImpression?: () => void;
};

function HomeHeroCarousel({ onImpression }: Props) {
  useEffect(() => {
    onImpression?.();
  }, [onImpression]);

  // Placeholder “hero” sem depender de dados/serviços externos.
  const cards = [
    { title: "Ofertas do dia", subtitle: "Seleção premium • frete rápido" },
    { title: "Achados", subtitle: "Descubra novidades em minutos" },
    { title: "Mais vendidos", subtitle: "O que está em alta agora" },
  ];

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {cards.map((c) => (
          <TouchableOpacity key={c.title} activeOpacity={0.9} style={styles.card}>
            <Text style={styles.title}>{c.title}</Text>
            <Text style={styles.sub}>{c.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 6 },
  row: { gap: 10, paddingRight: 10 },
  card: {
    width: 260,
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#262626",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  sub: {
    marginTop: 4,
    color: "#B8B8B8",
    fontSize: 12,
    fontWeight: "600",
  },
});

export default memo(HomeHeroCarousel);
