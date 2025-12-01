import { TextStyle } from "react-native";

/**
 * Font size scale
 */
export const fontSize = {
  /** 11px */
  xs: 11,
  /** 12px */
  sm: 12,
  /** 13px */
  md: 13,
  /** 14px */
  base: 14,
  /** 15px */
  lg: 15,
  /** 16px */
  xl: 16,
  /** 18px */
  xxl: 18,
  /** 20px */
  xxxl: 20,
  /** 22px */
  h2: 22,
  /** 26px */
  h1: 26,
  /** 28px */
  display2: 28,
  /** 30px */
  display1: 30,
  /** 34px */
  hero: 34,
  /** 40px */
  giant: 40,
} as const;

/**
 * Font weight scale
 */
export const fontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
  extrabold: "800" as const,
};

/**
 * Pre-composed typography styles
 */
export const typography: Record<string, TextStyle> = {
  // Headings
  h1: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.extrabold,
    lineHeight: 32,
  },
  h2: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.bold,
    lineHeight: 28,
  },
  h3: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.semibold,
    lineHeight: 24,
  },

  // Body text
  bodyLarge: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.medium,
    lineHeight: 22,
  },
  body: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.regular,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.regular,
    lineHeight: 18,
  },

  // Labels
  label: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    lineHeight: 18,
  },
  labelSmall: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    lineHeight: 16,
  },

  // Buttons
  button: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    lineHeight: 20,
  },
  buttonSmall: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    lineHeight: 18,
  },

  // Caption
  caption: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular,
    lineHeight: 16,
  },
};

export type FontSizeKey = keyof typeof fontSize;
export type FontWeightKey = keyof typeof fontWeight;
export type TypographyKey = keyof typeof typography;

