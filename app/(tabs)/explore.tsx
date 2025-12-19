import { StyleSheet } from "react-native";

import ParallaxScrollView from "../../components/parallax-scroll-view";
import { ThemedText } from "../../components/themed-text";
import { ThemedView } from "../../components/themed-view";
import { Collapsible } from "../../components/ui/collapsible";
import { IconSymbol } from "../../components/ui/icon-symbol";

export default function ExploreScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#D0D0D0", dark: "#353636" }}
      headerImage={
        <IconSymbol
          size={310}
          name="code-slash"
          style={styles.headerImage}
          color="#808080"
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Explorar</ThemedText>
      </ThemedView>

      <ThemedText>Agora o Collapsible não quebra mais o render.</ThemedText>

      <Collapsible title="Seção de teste">
        <ThemedText type="default">Conteúdo dentro do Collapsible.</ThemedText>
      </Collapsible>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    position: "absolute",
    bottom: -90,
    left: -35,
  },
  titleContainer: {
    flexDirection: "row",
    gap: 8,
  },
});
