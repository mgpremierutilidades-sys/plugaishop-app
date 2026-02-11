// components/parallax-scroll-view.tsx
import { PropsWithChildren, ReactElement } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollViewOffset,
} from "react-native-reanimated";

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
}>;

const HEADER_HEIGHT = 240;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
}: Props) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);

  const headerAnimatedStyle = useAnimatedStyle(() => {
    // mais estável em iOS (menos “saltos”)
    const translateY = interpolate(
      scrollOffset.value,
      [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
      [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * 0.75]
    );

    const scale = interpolate(
      scrollOffset.value,
      [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
      [1.6, 1, 1]
    );

    return {
      transform: [{ translateY }, { scale }],
    };
  });

  // fallback: se hooks falharem por algum motivo, o header ainda aparece.
  const bgLight = headerBackgroundColor.light;
  const bgDark = headerBackgroundColor.dark;

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        ref={scrollRef}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={[styles.header, { backgroundColor: bgLight }]}>
          <Animated.View style={[styles.headerInner, headerAnimatedStyle]}>
            {headerImage}
          </Animated.View>

          {/* camada de segurança para evitar “flash” branco no iOS */}
          <View
            pointerEvents="none"
            style={[
              styles.headerOverlay,
              { backgroundColor: Platform.OS === "ios" ? bgDark : "transparent" },
            ]}
          />
        </View>

        <View style={styles.content}>{children}</View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    height: HEADER_HEIGHT,
    overflow: "hidden",
  },

  headerInner: {
    ...StyleSheet.absoluteFillObject,
  },

  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
  },

  contentContainer: {
    paddingBottom: 28,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
});
