import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from "react-native";
import colors from "../theme/colors";
import { spacing, radius, typography } from "../constants";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "dark";
type ButtonSize = "sm" | "md" | "lg";

interface AppButtonProps extends TouchableOpacityProps {
  /** Button label text */
  title: string;
  /** Visual variant */
  variant?: ButtonVariant;
  /** Size preset */
  size?: ButtonSize;
  /** Show loading spinner */
  loading?: boolean;
  /** Take full width */
  fullWidth?: boolean;
  /** Icon on the left */
  leftIcon?: React.ReactNode;
  /** Icon on the right */
  rightIcon?: React.ReactNode;
}

export function AppButton({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = true,
  leftIcon,
  rightIcon,
  disabled,
  style,
  ...props
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  const containerStyles: ViewStyle[] = [
    styles.base,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    style as ViewStyle,
  ];

  const textStyles: TextStyle[] = [
    styles.text,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
  ];

  return (
    <TouchableOpacity
      style={containerStyles}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "outline" || variant === "ghost" ? colors.primary : colors.white}
          size="small"
        />
      ) : (
        <>
          {leftIcon}
          <Text style={textStyles}>{title}</Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  fullWidth: {
    width: "100%",
  },
  disabled: {
    opacity: 0.5,
  },

  // Variants
  variant_primary: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
  },
  variant_secondary: {
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
  },
  variant_outline: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  variant_ghost: {
    backgroundColor: "transparent",
  },
  variant_dark: {
    backgroundColor: colors.black,
    borderRadius: radius.md,
  },

  // Sizes
  size_sm: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
  },
  size_md: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  size_lg: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xxl,
  },

  // Text
  text: {
    ...typography.button,
  },
  text_primary: {
    color: colors.textOnPrimary,
  },
  text_secondary: {
    color: colors.primary,
  },
  text_outline: {
    color: colors.primary,
  },
  text_ghost: {
    color: colors.textSecondary,
  },
  text_dark: {
    color: colors.white,
  },

  // Text sizes
  textSize_sm: {
    ...typography.buttonSmall,
  },
  textSize_md: {
    ...typography.button,
  },
  textSize_lg: {
    ...typography.button,
    fontSize: 18,
  },
});

export default AppButton;

