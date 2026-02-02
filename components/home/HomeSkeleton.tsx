import { memo } from "react";
import { StyleSheet, View } from "react-native";

function Block({ h }: { h: number }) {
  return <View style={[styles.block, { height: h }]} />;
}

function HomeSkeleton() {
  return (
    <View style={styles.wrap}>
      <Block h={120} />
      <View style={styles.row}>
        <Block h={70} />
        <Block h={70} />
        <Block h={70} />
      </View>
      <Block h={44} />
      <Block h={44} />
      <View style={styles.grid}>
        <Block h={80} />
        <Block h={80} />
        <Block h={80} />
        <Block h={80} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: "#0B0B0B",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  block: {
    borderRadius: 16,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#262626",
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
});

export default memo(HomeSkeleton);
