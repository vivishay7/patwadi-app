import React from "react";
import { View, StyleSheet, ViewStyle, ViewProps } from "react-native";
import colors from "../theme/colors";
import { spacing, radius } from "../constants";

type CardVariant = "default" | "elevated" | "outlined" | "blush";

interface CardProps extends ViewProps {
  variant?: CardVariant;
  padding?: keyof typeof spacing | number;
  children: React.ReactNode;
}

export function Card({
  variant = "default",
  padding = "xl",
  children,
  style,
  ...props
}: CardProps) {
  const paddingValue = typeof padding === "number" ? padding : spacing[padding];

  const containerStyles: ViewStyle[] = [
    styles.base,
    styles[`variant_${variant}`],
    { padding: paddingValue },
    style as ViewStyle,
  ];

  return (
    <View style={containerStyles} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
  },

  // Variants
  variant_default: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  variant_elevated: {
    backgroundColor: colors.surface,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  variant_outlined: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.borderDark,
  },
  variant_blush: {
    backgroundColor: colors.secondary,
  },
});

export default Card;

