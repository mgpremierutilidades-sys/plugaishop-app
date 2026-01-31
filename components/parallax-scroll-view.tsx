import type { PropsWithChildren, ReactElement } from "react";
import type { ScrollViewProps } from "react-native";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollOffset,
} from "react-native-reanimated";

import { ThemedView } from "@/components/themed-view";
import { getFooterOffset } from "@/constants/layout";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";

export const PARALLAX_HEADER_HEIGHT = 250;
export const PARALLAX_CONTENT_PADDING = 32;

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
  /** Pass-through (Etapa 2): permite onScroll/onContentSizeChange sem alterar layout */
  scrollViewProps?: Omit<ScrollViewProps, "ref">;
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
  scrollViewProps,
}: Props) {
  const backgroundColor = useThemeColor({}, "background");
  const colorScheme = useColorScheme() ?? "light";
  const insets = useSafeAreaInsets();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollOffset(scrollRef);
  const footerOffset = getFooterOffset(insets.bottom);

  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            scrollOffset.value,
            [-PARALLAX_HEADER_HEIGHT, 0, PARALLAX_HEADER_HEIGHT],
            [-PARALLAX_HEADER_HEIGHT / 2, 0, PARALLAX_HEADER_HEIGHT * 0.75]
          ),
        },
        {
          scale: interpolate(
            scrollOffset.value,
            [-PARALLAX_HEADER_HEIGHT, 0, PARALLAX_HEADER_HEIGHT],
            [2, 1, 1]
          ),
        },
      ],
    };
  });

  const {
    style,
    contentContainerStyle,
    scrollEventThrottle,
    ...restScrollProps
  } = scrollViewProps ?? {};

  return (
    <ThemedView style={[styles.screen, { backgroundColor }]}>
      <Animated.ScrollView
        ref={scrollRef}
        style={[{ flex: 1 }, style]}
        contentContainerStyle={[{ paddingBottom: footerOffset }, contentContainerStyle]}
        scrollEventThrottle={scrollEventThrottle ?? 16}
        {...restScrollProps}
      >
        <Animated.View
          style={[
            styles.header,
            { backgroundColor: headerBackgroundColor[colorScheme] },
            headerAnimatedStyle,
          ]}
        >
          {headerImage}
        </Animated.View>

        <ThemedView style={styles.content}>{children}</ThemedView>
      </Animated.ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    height: PARALLAX_HEADER_HEIGHT,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    padding: PARALLAX_CONTENT_PADDING,
    gap: 16,
    overflow: "hidden",
  },
});
