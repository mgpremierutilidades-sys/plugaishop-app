import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import IconSymbol from "./ui/icon-symbol";

export default function BackButtonOverlay() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.button}>
        <IconSymbol name="arrow-back" size={22} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: -6,      // 🔹 pode ajustar para subir acima do banner
    left: 12,
    zIndex: 20,
  },
  button: {
    padding: 6,
  },
});
