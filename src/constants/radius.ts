/**
 * Border radius scale for consistent rounded corners
 */
export const radius = {
  /** 8px - subtle rounding */
  xs: 8,
  /** 12px - small cards, inputs */
  sm: 12,
  /** 16px - medium cards, buttons */
  md: 16,
  /** 18px - large buttons, cards */
  lg: 18,
  /** 22px - prominent cards */
  xl: 22,
  /** 24px - modal corners */
  xxl: 24,
  /** 28px - large badges */
  xxxl: 28,
  /** 40px - circular elements */
  full: 40,
} as const;

export type RadiusKey = keyof typeof radius;
export type RadiusValue = (typeof radius)[RadiusKey];

