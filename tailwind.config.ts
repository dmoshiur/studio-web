import type { Config } from "tailwindcss";

/**
 * ManUp — Maison Lumière design tokens.
 * A premium editorial light theme: warm paper whites, near-black ink,
 * hairline borders and a restrained champagne-gold accent.
 * Obsidian + ivory scales are retained for the dark footer, imagery
 * overlays and the internal studio surfaces.
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1.25rem", sm: "1.75rem", lg: "2.5rem" },
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        gold: {
          50: "#fdfaf0",
          100: "#faf1d7",
          200: "#f3e6b8",
          300: "#e6c65c",
          400: "#d8b445",
          500: "#c9a227",
          600: "#ad8a1e",
          700: "#8f7320",
          800: "#6f591a",
          900: "#4c3d12",
        },
        /* Primary brand — deep conference violet. Buttons, active states, highlights. */
        brand: {
          50: "#f4f1ff",
          100: "#ebe4ff",
          200: "#d9ccff",
          300: "#bda3ff",
          400: "#9d72fb",
          500: "#7f45f0",
          600: "#6d28d9",
          700: "#5b21b6",
          800: "#4c1d95",
          900: "#331367",
          950: "#1d0b3f",
        },
        /* Secondary accent — warm ember orange. Badges, dots, highlights. */
        ember: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
        },
        /* Supporting accent — confident royal blue (used sparingly). */
        royal: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        /* Warm paper surfaces — the light-theme canvas. */
        paper: {
          DEFAULT: "#fafaf8",
          50: "#ffffff",
          100: "#fafaf8",
          200: "#f5f5f1",
          300: "#efefea",
          400: "#e8e8e2",
        },
        /* Hairline borders for cards, tables and separators. */
        line: {
          DEFAULT: "#e8e8e5",
          strong: "#dcdcd5",
        },
        /* Neutral ink — primary & secondary typography on light. */
        ink: {
          DEFAULT: "#111111",
          50: "#f7f7f5",
          100: "#edede9",
          200: "#dcdcd6",
          300: "#a8a8a2",
          400: "#6f6f6a",
          500: "#6b6b6b",
          600: "#3e3e3a",
          700: "#2b2b28",
          800: "#1c1c1a",
          900: "#111111",
          950: "#0b0b0b",
        },
        obsidian: {
          50: "#f6f6f7",
          100: "#e6e6e9",
          200: "#c9c9cf",
          300: "#a2a2ab",
          400: "#7a7a86",
          500: "#565661",
          600: "#3c3c45",
          700: "#282830",
          800: "#1a1a21",
          900: "#101015",
          950: "#08080a",
        },
        ivory: {
          50: "#ffffff",
          100: "#f8f5ef",
          200: "#efe9dd",
          300: "#ded6c6",
          400: "#c2b8a4",
          500: "#9b9382",
          600: "#776f60",
        },
        crimson: {
          400: "#a94450",
          500: "#8c2f39",
          600: "#6e242c",
        },
        danger: "#c0392b",
        success: "#2f7d5f",
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "Playfair Display", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        script: ["Great Vibes", "Apple Chancery", "cursive"],
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(100deg, #8f7320 0%, #d8b445 45%, #f3e6b8 60%, #c9a227 100%)",
        "gold-sheen": "linear-gradient(120deg, rgba(201,162,39,0) 0%, rgba(201,162,39,.35) 50%, rgba(201,162,39,0) 100%)",
        "obsidian-gradient": "linear-gradient(180deg, #101015 0%, #08080a 100%)",
        "obsidian-soft": "linear-gradient(180deg, #14141a 0%, #0e0e12 100%)",
        "ivory-gradient": "linear-gradient(180deg, #ffffff 0%, #f8f5ef 100%)",
        /* Light-theme section washes */
        "paper-gradient": "linear-gradient(180deg, #fafaf8 0%, #f6f6f2 100%)",
        "paper-soft": "linear-gradient(180deg, #f7f7f4 0%, #f2f2ee 100%)",
        "card-sheen": "linear-gradient(180deg, #ffffff 0%, #fcfcfb 100%)",
        /* Brand color system — violet primary, ember secondary */
        "brand-gradient": "linear-gradient(120deg, #4c1d95 0%, #6d28d9 48%, #7f45f0 100%)",
        "brand-deep": "linear-gradient(150deg, #1d0b3f 0%, #331367 45%, #4c1d95 100%)",
        "brand-ember": "linear-gradient(100deg, #6d28d9 0%, #a855f7 45%, #f97316 100%)",
        "tint-lavender": "linear-gradient(180deg, #faf8ff 0%, #f3efff 100%)",
        "tint-peach": "linear-gradient(180deg, #fffdf9 0%, #fdf3e7 100%)",
        "tint-sky": "linear-gradient(180deg, #fbfdff 0%, #eef4ff 100%)",
      },
      boxShadow: {
        luxe: "0 1px 2px rgba(17,17,17,.05), 0 24px 60px -28px rgba(17,17,17,.22)",
        card: "0 1px 2px rgba(17,17,17,.04), 0 10px 28px -14px rgba(17,17,17,.10)",
        lift: "0 2px 4px rgba(17,17,17,.05), 0 26px 52px -22px rgba(17,17,17,.18)",
        gold: "0 18px 50px -22px rgba(201,162,39,.45)",
        "gold-sm": "0 10px 30px -18px rgba(201,162,39,.4)",
        brand: "0 18px 50px -20px rgba(109,40,217,.5)",
        "brand-sm": "0 10px 30px -14px rgba(109,40,217,.45)",
        ember: "0 18px 50px -22px rgba(249,115,22,.45)",
        inset: "inset 0 1px 0 rgba(255,255,255,.6)",
      },
      borderRadius: {
        xl2: "1.25rem",
        xs: "2px",
      },
      letterSpacing: {
        luxe: "0.42em",
        wide2: "0.24em",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(22px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fade: { from: { opacity: "0" }, to: { opacity: "1" } },
        "scale-in": {
          from: { opacity: "0", transform: "scale(.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "line-grow": {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(28px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up .8s cubic-bezier(.22,.61,.36,1) both",
        fade: "fade .6s ease both",
        "scale-in": "scale-in .3s ease both",
        "line-grow": "line-grow .9s cubic-bezier(.22,.61,.36,1) both",
        "slide-in-right": "slide-in-right .6s cubic-bezier(.22,.61,.36,1) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

// tailwindcss-animate is optional; guard if missing
export default config;
