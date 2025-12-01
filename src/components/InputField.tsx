import React from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from "react-native";
import colors from "../theme/colors";
import { spacing, radius, typography } from "../constants";

interface InputFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export function InputField({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  containerStyle,
  style,
  ...props
}: InputFieldProps) {
  const hasError = Boolean(error);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={[styles.inputContainer, hasError && styles.inputError]}>
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            leftIcon && styles.inputWithLeftIcon,
            rightIcon && styles.inputWithRightIcon,
            style,
          ]}
          placeholderTextColor={colors.textSecondary}
          {...props}
        />
        {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
      </View>

      {(error || helperText) && (
        <Text style={[styles.helperText, hasError && styles.errorText]}>
          {error || helperText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: radius.md,
  },
  inputError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    color: colors.textPrimary,
  },
  inputWithLeftIcon: {
    paddingLeft: spacing.xs,
  },
  inputWithRightIcon: {
    paddingRight: spacing.xs,
  },
  iconLeft: {
    paddingLeft: spacing.lg,
  },
  iconRight: {
    paddingRight: spacing.lg,
  },
  helperText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  errorText: {
    color: colors.error,
  },
});

export default InputField;

