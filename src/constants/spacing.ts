/**
 * Spacing scale for consistent margins, padding, and gaps
 * Based on 4px base unit with custom scale
 */
export const spacing = {
  /** 4px */
  xs: 4,
  /** 6px */
  sm: 6,
  /** 10px */
  md: 10,
  /** 14px */
  lg: 14,
  /** 18px */
  xl: 18,
  /** 22px */
  xxl: 22,
  /** 26px */
  xxxl: 26,
  /** 30px */
  huge: 30,
  /** 40px */
  massive: 40,
} as const;

export type SpacingKey = keyof typeof spacing;
export type SpacingValue = (typeof spacing)[SpacingKey];

