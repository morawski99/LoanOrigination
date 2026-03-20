import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
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
      },
      fontFamily: {
        sans: ["Inter", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["JetBrains Mono", "Roboto Mono", "monospace"],
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        "2xl": "48px",
        "3xl": "64px",
      },
      boxShadow: {
        sm: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
        md: "0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)",
        lg: "0 10px 15px rgba(0,0,0,0.07), 0 4px 6px rgba(0,0,0,0.05)",
        xl: "0 20px 25px rgba(0,0,0,0.07), 0 10px 10px rgba(0,0,0,0.04)",
      },
      borderRadius: {
        DEFAULT: "6px",
      },
    },
  },
  plugins: [],
};

export default config;
