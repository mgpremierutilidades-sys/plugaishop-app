// app/categories/index.tsx
import { router } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppHeader from "../../components/AppHeader";
import { CATEGORIES, type Category } from "../../constants/categories";
import theme from "../../constants/theme";

export default function CategoriesScreen() {
  const handleOpenCategory = (category: Category) => {
    router.push(`/category/${category.slug}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title="Todas as categorias"
        subtitle="Navegue pelos departamentos da Plugaí Shop e encontre tudo para sua casa, família e dia a dia."
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Departamentos</Text>

        <View style={styles.list}>
          {CATEGORIES.map((cat: Category) => (
            <TouchableOpacity
              key={cat.slug}
              activeOpacity={0.85}
              style={styles.categoryCard}
              onPress={() => handleOpenCategory(cat)}
            >
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryName}>{cat.name}</Text>
                {cat.highlight && (
                  <View style={styles.highlightBadge}>
                    <Text style={styles.highlightText}>Destaque</Text>
                  </View>
                )}
              </View>

              {cat.description && (
                <Text style={styles.categoryDescription}>
                  {cat.description}
                </Text>
              )}

              <Text style={styles.categoryLink}>Ver produtos</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>
            Em breve: filtros avançados, recomendações personalizadas e
            categorias inteligentes com base no seu histórico de navegação.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  sectionTitle: {
    ...theme.typography.sectionTitle,
    marginBottom: 12,
  },

  list: {
    gap: 12,
  },

  categoryCard: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },

  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  categoryName: {
    ...theme.typography.bodyStrong,
  },

  highlightBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.primarySoft,
  },

  highlightText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.primaryDark,
  },

  categoryDescription: {
    ...theme.typography.body,
    color: theme.colors.icon,
    marginBottom: 6,
  },

  categoryLink: {
    ...theme.typography.caption,
    fontWeight: "700",
    color: theme.colors.primaryDark,
  },

  footerInfo: {
    marginTop: 24,
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceAlt,
  },

  footerText: {
    ...theme.typography.caption,
    color: theme.colors.icon,
    textAlign: "center",
  },
});

export { };
