import { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, ViewStyle } from "react-native";
import colors from "../theme/colors";
import { spacing, radius } from "../constants";

interface ListSkeletonProps {
  rows?: number;
  style?: ViewStyle;
}

export function ListSkeleton({ rows = 3, style }: ListSkeletonProps) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={style}>
      {Array.from({ length: rows }, (_, i) => (
        <Animated.View key={i} style={[styles.row, { opacity: pulse }]}>
          <View style={styles.lineWide} />
          <View style={styles.lineMedium} />
          <View style={styles.lineShort} />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  lineWide: {
    height: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.borderLight,
    marginBottom: spacing.sm,
    width: "70%",
  },
  lineMedium: {
    height: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.borderLight,
    marginBottom: spacing.sm,
    width: "50%",
  },
  lineShort: {
    height: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.borderLight,
    width: "35%",
  },
});

export default ListSkeleton;
