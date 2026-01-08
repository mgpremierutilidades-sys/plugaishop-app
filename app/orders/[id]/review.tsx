// app/orders/[id]/review.tsx
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../../../components/themed-text";
import { ThemedView } from "../../../components/themed-view";
import theme from "../../../constants/theme";

import { getOrderById, setOrderReview } from "../../../utils/ordersStore";

export default function OrderReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");

  const orderId = useMemo(() => String(id ?? ""), [id]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const o = await getOrderById(orderId);
        if (!alive) return;

        const existing = (o as any)?.review;
        if (existing) {
          const s = Number((existing as any).stars ?? (existing as any).rating ?? 5);
          setStars(Math.max(1, Math.min(5, s)));
          setComment(String((existing as any).comment ?? ""));
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [orderId]);

  async function onSubmit() {
    try {
      await setOrderReview(orderId, stars, comment);
      Alert.alert("Obrigado!", "Sua avaliação foi enviada.");
      router.back();
    } catch {
      Alert.alert("Erro", "Não foi possível salvar sua avaliação.");
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ThemedView style={styles.container}>
          <ThemedText>Carregando...</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <ThemedText style={styles.backText}>←</ThemedText>
          </Pressable>

          <ThemedText style={styles.title}>Avaliar pedido</ThemedText>

          <View style={{ width: 44 }} />
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.label}>Nota (1 a 5)</ThemedText>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => setStars(n)}
                style={[styles.star, n <= stars ? styles.starOn : styles.starOff]}
              >
                <ThemedText style={styles.starText}>{n <= stars ? "★" : "☆"}</ThemedText>
              </Pressable>
            ))}
          </View>

          <ThemedText style={[styles.label, { marginTop: 16 }]}>Comentário</ThemedText>

          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Conte como foi sua experiência"
            placeholderTextColor={"rgba(0,0,0,0.45)"}
            style={styles.input}
            multiline
          />

          <Pressable onPress={onSubmit} style={styles.cta}>
            <ThemedText style={styles.ctaText}>Enviar avaliação</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, padding: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.divider,
  },
  backText: { fontFamily: "Arimo", fontSize: 22, fontWeight: "700", color: theme.colors.text },
  title: { fontFamily: "Arimo", fontSize: 24, fontWeight: "700", color: theme.colors.text },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.divider,
    padding: 14,
  },
  label: { fontFamily: "OpenSans", fontSize: 12, fontWeight: "700", color: theme.colors.text },
  starsRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  star: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.divider,
  },
  starOn: { backgroundColor: theme.colors.surfaceAlt },
  starOff: { backgroundColor: theme.colors.surface },
  starText: { fontFamily: "Arimo", fontSize: 20, fontWeight: "700", color: theme.colors.text },
  input: {
    marginTop: 10,
    minHeight: 110,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.divider,
    padding: 12,
    fontFamily: "OpenSans",
    fontSize: 12,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    textAlignVertical: "top",
  },
  cta: {
    marginTop: 14,
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { fontFamily: "OpenSans", fontSize: 14, fontWeight: "700", color: "#fff" },
});
