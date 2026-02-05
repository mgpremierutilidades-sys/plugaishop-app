import type { ReactElement } from "react";
import { StyleSheet, type ScrollViewProps, View } from "react-native";
import Animated, { interpolate, useAnimatedRef, useAnimatedStyle, useScrollViewOffset } from "react-native-reanimated";

import { ThemedView } from "./themed-view";

type Props = {
  headerImage: ReactElement;
  headerBackgroundColor: { light: string; dark: string };
  children: ReactElement;

  // ✅ usado no Home
  scrollViewProps?: Omit<ScrollViewProps, "ref">;
};

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
  scrollViewProps,
}: Props) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);

  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: interpolate(scrollOffset.value, [-250, 0, 250], [-125, 0, 75]) },
        { scale: interpolate(scrollOffset.value, [-250, 0, 250], [2, 1, 1]) },
      ],
    };
  });

  return (
    <ThemedView style={styles.container}>
      <Animated.ScrollView ref={scrollRef} scrollEventThrottle={16} {...scrollViewProps}>
        <Animated.View
          style={[
            styles.header,
            { backgroundColor: headerBackgroundColor.light },
            headerAnimatedStyle,
          ]}
        >
          <View style={styles.headerContent}>{headerImage}</View>
        </Animated.View>

        <ThemedView style={styles.content}>{children}</ThemedView>
      </Animated.ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 250, overflow: "hidden" },
  headerContent: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { flex: 1, padding: 16, gap: 16 },
});
