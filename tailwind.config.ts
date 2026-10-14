import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Ana vurgu: sıcak filament turuncusu
        brand: {
          50: "#fff4ed",
          100: "#ffe6d5",
          200: "#ffc9aa",
          400: "#ff8a4c",
          500: "#ff6b2c",
          600: "#f04d0e",
          700: "#c73a0a",
        },
        // Koyu yüzeyler: baskı tablası / atölye
        ink: {
          50: "#f5f7fb",
          100: "#e9edf5",
          200: "#d3d9e6",
          300: "#a9b3c7",
          400: "#7a869e",
          500: "#556079",
          600: "#3a4459",
          700: "#252d3e",
          800: "#161c2a",
          900: "#0d121d",
          950: "#070a12",
        },
        filament: { orange: "#ff6b2c", pink: "#ff3d8b", cyan: "#22d3ee", lime: "#a3e635" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "ui-sans-serif", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,107,44,.25), 0 8px 30px -8px rgba(255,107,44,.45)",
        card: "0 1px 2px rgba(13,18,29,.04), 0 8px 24px -12px rgba(13,18,29,.12)",
      },
      keyframes: {
        // Nesne alttan yukarı katman katman "basılır"
        "print-build": {
          "0%": { clipPath: "inset(100% 0 0 0)" },
          "70%, 90%": { clipPath: "inset(0 0 0 0)" },
          "100%": { clipPath: "inset(0 0 0 0)", opacity: "0" },
        },
        "nozzle-x": {
          "0%, 100%": { transform: "translateX(-46px)" },
          "50%": { transform: "translateX(46px)" },
        },
        "nozzle-y": {
          "0%": { transform: "translateY(118px)" },
          "70%, 100%": { transform: "translateY(0)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "print-build": "print-build 7s cubic-bezier(.4,0,.6,1) infinite",
        "nozzle-x": "nozzle-x 0.9s ease-in-out infinite",
        "nozzle-y": "nozzle-y 7s cubic-bezier(.4,0,.6,1) infinite",
        "float-slow": "float-slow 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
