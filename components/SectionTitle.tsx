import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import theme from "../constants/theme";

type Props = {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
  style?: ViewStyle;
};

const SectionTitle: React.FC<Props> = ({
  title,
  actionLabel,
  onActionPress,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onActionPress ? (
        <TouchableOpacity onPress={onActionPress}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  title: {
    ...theme.typography.sectionTitle,
  },
  action: {
    ...theme.typography.bodyStrong,
    color: theme.colors.primary,
  },
});

export default SectionTitle;
