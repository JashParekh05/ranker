import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#f4f1ff",
          100: "#ece6ff",
          200: "#dbd0ff",
          300: "#c1abff",
          400: "#a37cff",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
        },
        ink: "#1a1626",
        muted: "#6b6480",
      },
      boxShadow: {
        pop: "0 8px 30px -8px rgba(124, 58, 237, 0.35)",
        soft: "0 4px 20px -6px rgba(26, 22, 38, 0.15)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
