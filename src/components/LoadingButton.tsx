import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
  ViewStyle,
} from "react-native";
import colors from "../theme/colors";
import { spacing, radius, typography } from "../constants";

interface LoadingButtonProps extends TouchableOpacityProps {
  title: string;
  isLoading?: boolean;
  variant?: "primary" | "ghost";
}

export function LoadingButton({
  title,
  isLoading = false,
  variant = "primary",
  disabled,
  style,
  ...props
}: LoadingButtonProps) {
  const isDisabled = disabled || isLoading;

  const containerStyles: ViewStyle[] = [
    styles.base,
    variant === "primary" ? styles.primary : styles.ghost,
    isDisabled && styles.disabled,
    style as ViewStyle,
  ];

  return (
    <TouchableOpacity style={containerStyles} disabled={isDisabled} activeOpacity={0.8} {...props}>
      {isLoading ? (
        <ActivityIndicator
          color={variant === "primary" ? colors.white : colors.primary}
          size="small"
        />
      ) : (
        <Text style={[styles.text, variant === "ghost" && styles.ghostText]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    width: "100%",
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: colors.primary,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    ...typography.button,
    color: colors.white,
  },
  ghostText: {
    color: colors.primary,
    ...typography.bodySmall,
    fontWeight: "500",
  },
});

export default LoadingButton;
