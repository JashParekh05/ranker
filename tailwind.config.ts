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
          400: "#a789ff",
          500: "#9b6bff",
          600: "#8b5cf6",
          700: "#7c3aed",
          800: "#5b21b6",
          900: "#4c1d95",
        },
        // dark surfaces (4-tier, never pure black)
        base: "#0b0b12",
        surface: "#14141f",
        raised: "#1b1b2a",
        ink: "#f2eeff",
        muted: "#a49dc0",
      },
      boxShadow: {
        pop: "0 10px 40px -10px rgba(155, 107, 255, 0.5)",
        soft: "0 8px 30px -12px rgba(0, 0, 0, 0.6)",
        glass: "0 8px 32px -8px rgba(0,0,0,0.55), inset 0 1px 0 0 rgba(255,255,255,0.08)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
