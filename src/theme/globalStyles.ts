import { StyleSheet, ViewStyle, TextStyle } from "react-native";
import colors from "./colors";
import { spacing, radius, typography } from "../constants";

/**
 * Shared card styles
 */
export const cardStyles = StyleSheet.create({
  /** Default card with border */
  default: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.xl,
  } as ViewStyle,

  /** Card with soft blush background */
  blush: {
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
  } as ViewStyle,

  /** Elevated card with shadow */
  elevated: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xl,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  } as ViewStyle,
});

/**
 * Shared button styles
 */
export const buttonStyles = StyleSheet.create({
  /** Primary red button */
  primary: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,

  /** Outline button */
  outline: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.lg,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,

  /** Dark button */
  dark: {
    backgroundColor: colors.black,
    paddingVertical: spacing.xl,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,

  /** Primary button text */
  primaryText: {
    ...typography.button,
    color: colors.textOnPrimary,
  } as TextStyle,

  /** Outline button text */
  outlineText: {
    ...typography.button,
    color: colors.primary,
  } as TextStyle,

  /** Dark button text */
  darkText: {
    ...typography.button,
    color: colors.white,
  } as TextStyle,
});

/**
 * Shared input styles
 */
export const inputStyles = StyleSheet.create({
  /** Standard input container */
  container: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: radius.md,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
  } as ViewStyle,

  /** Input text */
  text: {
    fontSize: 16,
    color: colors.textPrimary,
  } as TextStyle,

  /** Input label */
  label: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  } as TextStyle,
});

/**
 * Shared layout styles
 */
export const layoutStyles = StyleSheet.create({
  /** Full screen container */
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  } as ViewStyle,

  /** Padded content container */
  content: {
    padding: spacing.xl,
  } as ViewStyle,

  /** Content with bottom padding for scroll */
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing.massive + spacing.massive,
  } as ViewStyle,

  /** Centered content */
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,

  /** Row layout */
  row: {
    flexDirection: "row",
    alignItems: "center",
  } as ViewStyle,

  /** Row with space between */
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  } as ViewStyle,
});

/**
 * Shared text styles
 */
export const textStyles = StyleSheet.create({
  /** Page title */
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  } as TextStyle,

  /** Page subtitle */
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  } as TextStyle,

  /** Section header */
  sectionHeader: {
    ...typography.bodyLarge,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  } as TextStyle,

  /** Back link text */
  backLink: {
    ...typography.body,
    color: colors.textSecondary,
  } as TextStyle,

  /** Link text */
  link: {
    ...typography.body,
    color: colors.primary,
  } as TextStyle,
});

export default {
  card: cardStyles,
  button: buttonStyles,
  input: inputStyles,
  layout: layoutStyles,
  text: textStyles,
};

