import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  TouchableOpacityProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import colors from "../theme/colors";
import { spacing, radius, typography } from "../constants";

interface PhotoButtonProps extends TouchableOpacityProps {
  title?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
}

export function PhotoButton({
  title = "Take Photo",
  iconName = "camera-outline",
  style,
  ...props
}: PhotoButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.container, style]}
      activeOpacity={0.8}
      {...props}
    >
      <Ionicons name={iconName} size={20} color={colors.white} />
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  text: {
    ...typography.buttonSmall,
    color: colors.white,
  },
});

export default PhotoButton;

