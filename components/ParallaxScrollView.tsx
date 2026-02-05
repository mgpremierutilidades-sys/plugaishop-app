// components/ParallaxScrollView.tsx
import type { PropsWithChildren, ReactElement, ReactNode } from "react";
import React from "react";
import {
  ScrollView,
  View,
  useColorScheme,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type HeaderBg = { light: string; dark: string };

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: HeaderBg;
  scrollViewProps?: ScrollViewProps;
  contentContainerStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
}>;

export default function ParallaxScrollView(props: Props) {
  const { headerImage, headerBackgroundColor, scrollViewProps, contentContainerStyle, children } = props;

  const scheme = useColorScheme();
  const bg = scheme === "dark" ? headerBackgroundColor.dark : headerBackgroundColor.light;

  return (
    <ScrollView
      {...scrollViewProps}
      contentContainerStyle={contentContainerStyle}
      style={{ flex: 1, backgroundColor: bg }}
    >
      {/* Header */}
      <View style={{ backgroundColor: bg }}>{headerImage}</View>

      {/* Content */}
      {children}
    </ScrollView>
  );
}
