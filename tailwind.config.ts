import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Noto Sans TC",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      colors: {
        ink: "#10211C",
        paper: "#F6F7F2",
        moss: {
          50: "#f1f7f5",
          100: "#deeee9",
          200: "#b9dcd4",
          300: "#83c4b9",
          400: "#42a497",
          500: "#23877e",
          600: "#0F766E",
          700: "#0c5e58",
          800: "#124b47",
          900: "#123d3a",
        },
        coral: {
          50: "#fff4f0",
          100: "#ffe5dc",
          200: "#ffc9b8",
          300: "#f7a287",
          400: "#ee7c5f",
          500: "#dc624a",
          600: "#c64e39",
          700: "#a73d2d",
          800: "#863328",
          900: "#6e2d25",
        },
        plum: {
          50: "#fbf5f8",
          100: "#f5e8ee",
          200: "#ead0dd",
          500: "#77415e",
          600: "#632a4c",
          700: "#4f203d",
        },
      },
      boxShadow: {
        ambient: "0 18px 48px -34px rgb(16 33 28 / 0.38)",
        glow: "0 0 35px rgb(45 212 191 / 0.28)",
      },
    },
  },
  plugins: [],
} satisfies Config;
