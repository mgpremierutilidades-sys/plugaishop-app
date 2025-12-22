import React, { useMemo, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  UIManager,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import theme from "../../constants/theme";
import IconSymbol from "./icon-symbol";

type CollapsibleProps = {
  title: React.ReactNode;
  children: React.ReactNode;
  initiallyExpanded?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function Collapsible({
  title,
  children,
  initiallyExpanded = false,
  containerStyle,
}: CollapsibleProps) {
  const [open, setOpen] = useState(initiallyExpanded);

  const chevronName = useMemo(() => (open ? "chevron.up" : "chevron.down"), [open]);

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <Pressable onPress={toggle} style={styles.header} hitSlop={10}>
        <View style={styles.titleWrap}>{title}</View>

        <IconSymbol
          name={chevronName}
          size={18}
          color={theme.colors.textMuted}
          style={styles.chevron}
        />
      </Pressable>

      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderRadius: 14,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  titleWrap: {
    flex: 1,
    paddingRight: 10,
  },
  chevron: {
    opacity: 0.85,
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
});

export { Collapsible };
export default Collapsible;
