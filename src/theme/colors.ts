/**
 * Patwadi Color System
 * Warm, approachable palette with strong CTAs
 */
const colors = {
  // Backgrounds
  /** #FFF9F2 - Main app background (warm cream) */
  background: "#FFF9F2",
  /** #FFFFFF - Card/surface background */
  surface: "#FFFFFF",
  /** #3A3231 - Dark surface for contrast elements */
  surfaceDark: "#3A3231",

  // Brand colors
  /** #FF3A22 - Primary CTA red */
  primary: "#FF3A22",
  /** #FFDED9 - Soft blush for secondary elements */
  secondary: "#FFDED9",

  // Neutrals
  /** #3A3231 - Deep charcoal */
  dark: "#3A3231",
  /** #000000 */
  black: "#000000",
  /** #FFFFFF */
  white: "#FFFFFF",

  // Text colors
  /** #000000 - Primary text */
  textPrimary: "#000000",
  /** #3A3231 - Secondary/muted text */
  textSecondary: "#3A3231",
  /** #FFFFFF - Text on primary/dark backgrounds */
  textOnPrimary: "#FFFFFF",
  /** #FFFFFF - Text on dark surfaces */
  textOnDark: "#FFFFFF",

  // Borders
  /** rgba(0,0,0,0.08) - Light border */
  borderLight: "rgba(0,0,0,0.08)",
  /** rgba(0,0,0,0.25) - Dark border */
  borderDark: "rgba(0,0,0,0.25)",

  // Status colors
  /** #22C55E - Success green */
  success: "#22C55E",
  /** #F59E0B - Warning amber */
  warning: "#F59E0B",
  /** #EF4444 - Error red */
  error: "#EF4444",
  /** #3B82F6 - Info blue */
  info: "#3B82F6",

  // Overlays
  /** rgba(0,0,0,0.5) - Modal overlay */
  overlay: "rgba(0,0,0,0.5)",
  /** rgba(0,0,0,0.3) - Light overlay */
  overlayLight: "rgba(0,0,0,0.3)",
} as const;

export type ColorKey = keyof typeof colors;
export type ColorValue = (typeof colors)[ColorKey];

export default colors;
