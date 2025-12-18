import React from "react";
import { Image, StyleSheet, View, ViewStyle } from "react-native";
import theme from "../constants/theme";

type Props = {
  style?: ViewStyle;
  height?: number;
  horizontalPadding?: number; // deve bater com paddingHorizontal da tela
};

export default function AppBanner({
  style,
  height = 180,
  horizontalPadding = theme.spacing.lg,
}: Props) {
  return (
    <View style={[styles.wrapper, { marginHorizontal: -horizontalPadding }, style]}>
      <Image
        source={require("../assets/banners/banner-home.png")}
        style={[styles.banner, { height }]}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 4,
    marginBottom: theme.spacing.lg,
  },
  banner: {
    width: "100%",
  },
});
