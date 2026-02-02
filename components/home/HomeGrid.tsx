import { memo, useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  onImpression?: () => void;
};

function HomeGrid({ onImpression }: Props) {
  useEffect(() => {
    onImpression?.();
  }, [onImpression]);

  // Grid “vitrine” neutra (sem depender de catálogo aqui).
  const tiles = [
    { title: "Oferta relâmpago", sub: "por tempo limitado" },
    { title: "Recomendados", sub: "para você" },
    { title: "Novidades", sub: "chegaram agora" },
    { title: "Top descontos", sub: "economize hoje" },
  ];

  return (
    <View style={styles.grid}>
      {tiles.map((t) => (
        <TouchableOpacity key={t.title} activeOpacity={0.9} style={styles.tile}>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.sub}>{t.sub}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tile: {
    width: "48%",
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#262626",
    minHeight: 74,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  sub: {
    marginTop: 3,
    color: "#B8B8B8",
    fontSize: 11,
    fontWeight: "700",
  },
});

export default memo(HomeGrid);
