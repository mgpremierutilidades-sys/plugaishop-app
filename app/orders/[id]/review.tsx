// app/orders/[id]/review.tsx
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "../../../components/themed-text";
import { ThemedView } from "../../../components/themed-view";
import theme, { Radius, Spacing } from "../../../constants/theme";
import type { Order } from "../../../utils/ordersStore";
import { getOrderById, setOrderReview } from "../../../utils/ordersStore";

function safeString(v: unknown) {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}

export default function OrderReviewScreen() {
  const params = useLocalSearchParams();
  const orderId = safeString(params?.id);

  const [order, setOrder] = useState<Order | null>(null);
  const [stars, setStars] = useState<number>(5);
  const [comment, setComment] = useState<string>("");

  const load = useCallback(async () => {
    if (!orderId) {
      setOrder(null);
      return;
    }
    const found = await getOrderById(orderId);
    setOrder(found ?? null);

    if (found?.review) {
      setStars(found.review.stars);
      setComment(String(found.review.comment ?? ""));
    } else {
      setStars(5);
      setComment("");
    }
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const starsLabel = useMemo(() => `${stars} estrela(s)`, [stars]);

  const save = async () => {
    if (!orderId) return;

    const updated = await setOrderReview(orderId, stars, comment);
    if (!updated) {
      Alert.alert("Avaliação", "Não foi possível salvar sua avaliação.");
      return;
    }
    Alert.alert("Avaliação", "Avaliação salva com sucesso!");
    router.back();
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      <ThemedView style={styles.container}>
        <View style={styles.topbar}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <ThemedText style={styles.backArrow}>←</ThemedText>
          </Pressable>

          <ThemedText style={styles.title}>Avaliar compra</ThemedText>

          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ThemedView style={styles.card}>
            <ThemedText style={styles.cardTitle}>Pedido #{orderId}</ThemedText>
            <ThemedText style={styles.secondary}>
              {order?.review
                ? "Você já avaliou este pedido. Pode atualizar a qualquer momento."
                : "Conte como foi sua experiência."}
            </ThemedText>

            <View style={styles.divider} />

            <ThemedText style={styles.sectionTitle}>Sua nota</ThemedText>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => {
                const active = n <= stars;
                return (
                  <Pressable
                    key={n}
                    onPress={() => setStars(n)}
                    style={[styles.starPill, active ? styles.starActive : styles.starIdle]}
                  >
                    <ThemedText style={[styles.starText, active ? styles.starTextActive : styles.starTextIdle]}>
                      ★
                    </ThemedText>
                  </Pressable>
                );
              })}
              <ThemedText style={styles.secondary}>{starsLabel}</ThemedText>
            </View>

            <ThemedText style={styles.sectionTitle}>Comentário</ThemedText>

            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Escreva um comentário (opcional)"
              placeholderTextColor={"rgba(0,0,0,0.45)"}
              style={styles.input}
              multiline
              textAlignVertical="top"
            />

            <Pressable onPress={save} style={styles.primaryBtn}>
              <ThemedText style={styles.primaryBtnText}>Salvar avaliação</ThemedText>
            </Pressable>
          </ThemedView>

          <View style={{ height: 24 }} />
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },

  topbar: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  backArrow: { fontFamily: "Arimo", fontSize: 22, fontWeight: "700", color: theme.colors.text },
  title: { fontFamily: "Arimo", fontSize: 20, fontWeight: "700", color: theme.colors.text },

  scroll: { gap: Spacing.md, paddingBottom: 20 },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardTitle: { fontFamily: "Arimo", fontSize: 18, fontWeight: "700", color: theme.colors.text },

  divider: { height: 1, backgroundColor: theme.colors.divider, width: "100%", marginVertical: 6 },

  sectionTitle: { fontFamily: "OpenSans", fontSize: 12, fontWeight: "700", color: theme.colors.text },
  secondary: { fontFamily: "OpenSans", fontSize: 12, color: "rgba(0,0,0,0.65)" },

  starsRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  starPill: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  starIdle: { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider },
  starActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  starText: { fontFamily: "OpenSans", fontSize: 16, fontWeight: "700" },
  starTextIdle: { color: theme.colors.text },
  starTextActive: { color: "#FFFFFF" },

  input: {
    minHeight: 110,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "OpenSans",
    fontSize: 12,
    color: theme.colors.text,
  },

  primaryBtn: {
    paddingVertical: 12,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    marginTop: 6,
  },
  primaryBtnText: { fontFamily: "OpenSans", fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
});
