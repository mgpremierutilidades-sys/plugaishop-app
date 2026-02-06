// components/parallax-scroll-view.tsx
import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  useColorScheme,
  View,
  type ScrollViewProps,
  type ViewStyle,
} from "react-native";

type HeaderBackgroundColor = { light: string; dark: string };

export type ParallaxScrollViewProps = {
  children?: ReactNode; // ✅ aceita 1 ou múltiplos filhos
  headerImage: ReactNode;
  headerBackgroundColor: HeaderBackgroundColor;
  scrollViewProps?: ScrollViewProps;

  /**
   * Ajuste de padding/margens do corpo sem mexer nos filhos.
   */
  bodyStyle?: ViewStyle | ViewStyle[];
};

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
  scrollViewProps,
  bodyStyle,
}: ParallaxScrollViewProps) {
  const scheme = useColorScheme();

  const bg = useMemo(() => {
    const isDark = scheme === "dark";
    return isDark ? headerBackgroundColor.dark : headerBackgroundColor.light;
  }, [scheme, headerBackgroundColor.dark, headerBackgroundColor.light]);

  return (
    <ScrollView
      {...scrollViewProps}
      contentContainerStyle={[styles.content, scrollViewProps?.contentContainerStyle]}
    >
      <View style={[styles.header, { backgroundColor: bg }]}>{headerImage}</View>

      <View style={[styles.body, bodyStyle]}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 24,
  },
  header: {
    width: "100%",
    overflow: "hidden",
  },
  body: {
    flex: 1,
  },
});
