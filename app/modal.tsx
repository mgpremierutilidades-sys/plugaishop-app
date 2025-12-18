// app/modal.tsx
import { ThemedText } from "../components/themed-text";
import { ThemedView } from "../components/themed-view";

export default function ModalScreen() {
  return (
    <ThemedView
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
    >
      <ThemedText type="title">Tela Modal</ThemedText>
      <ThemedText>Esse modal é só um placeholder por enquanto.</ThemedText>
    </ThemedView>
  );
}
