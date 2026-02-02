import { memo, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  onImpression?: () => void;
};

function HomeBannerStrip({ onImpression }: Props) {
  useEffect(() => {
    onImpression?.();
  }, [onImpression]);

  return (
    <View style={styles.wrap}>
      <View style={styles.banner}>
        <Text style={styles.title}>Cupom • PRIMEIRA COMPRA</Text>
        <Text style={styles.sub}>Ative no checkout • válido hoje</Text>
      </View>
      <View style={styles.banner}>
        <Text style={styles.title}>Frete rápido</Text>
        <Text style={styles.sub}>Entrega estimada na sua região</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    gap: 10,
  },
  banner: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "#242424",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  sub: {
    marginTop: 2,
    color: "#B8B8B8",
    fontSize: 11,
    fontWeight: "600",
  },
});

export default memo(HomeBannerStrip);
