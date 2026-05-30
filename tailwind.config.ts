import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      boxShadow: {
        ambient: "0 20px 70px -35px rgb(15 23 42 / 0.45)",
        glow: "0 0 35px rgb(45 212 191 / 0.28)",
      },
    },
  },
  plugins: [],
} satisfies Config;
