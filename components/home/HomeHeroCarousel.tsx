import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

type Props = {
  onImpression?: () => void;
};

export default function HomeHeroCarousel({ onImpression }: Props) {
  useEffect(() => {
    onImpression?.();
  }, [onImpression]);

  return <View style={styles.hero} />;
}

const styles = StyleSheet.create({
  hero: { height: 160, borderRadius: 16, borderWidth: 1 },
});
