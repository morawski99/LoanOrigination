export const colors = {
  primary: {
    900: "#001F5B",
    800: "#003087",
    700: "#005EB8",
    600: "#117ACA",
    500: "#2E90D1",
    400: "#5AAEE0",
    300: "#87C7EE",
    200: "#B8DDF6",
    100: "#EBF5FC",
  },
  neutral: {
    900: "#1A1A1A",
    800: "#333333",
    700: "#555555",
    600: "#767676",
    500: "#999999",
    400: "#BBBBBB",
    300: "#E0E0E0",
    200: "#F0F0F0",
    100: "#F7F7F7",
    "000": "#FFFFFF",
  },
  success: "#006B3C",
  warning: "#E65100",
  error: "#C0392B",
} as const;

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  "2xl": "48px",
  "3xl": "64px",
} as const;

export const shadows = {
  sm: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
  md: "0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)",
  lg: "0 10px 15px rgba(0,0,0,0.07), 0 4px 6px rgba(0,0,0,0.05)",
  xl: "0 20px 25px rgba(0,0,0,0.07), 0 10px 10px rgba(0,0,0,0.04)",
} as const;

export const typography = {
  fontFamily: {
    sans: ["Inter", "Helvetica Neue", "Arial", "sans-serif"],
    mono: ["JetBrains Mono", "Roboto Mono", "monospace"],
  },
  fontSize: {
    xs: "12px",
    sm: "14px",
    base: "16px",
    lg: "18px",
    xl: "20px",
    "2xl": "24px",
    "3xl": "30px",
    "4xl": "36px",
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const borderRadius = {
  sm: "4px",
  DEFAULT: "6px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  full: "9999px",
} as const;

export const tokens = {
  colors,
  spacing,
  shadows,
  typography,
  borderRadius,
} as const;

export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type Shadows = typeof shadows;
export type Typography = typeof typography;

export default tokens;
