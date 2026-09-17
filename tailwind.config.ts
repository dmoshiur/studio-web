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
          50: "#fbf8f1",
          100: "#f6efe1",
          200: "#ede0c4",
          300: "#ddc99e",
          400: "#c9ad76",
          500: "#b99352",
          600: "#a77e3c",
          700: "#8c672d",
          800: "#6e4f21",
          900: "#4c3618",
        },
        /* Single brand accent — antique champagne, used across the public site. */
        brand: {
          50: "#fbf8f1",
          100: "#f6efe1",
          200: "#ede0c4",
          300: "#ddc99e",
          400: "#c9ad76",
          500: "#b99352",
          600: "#a77e3c",
          700: "#8c672d",
          800: "#6e4f21",
          900: "#4c3618",
          950: "#111111",
        },
        /* Legacy names intentionally resolve to the same single accent. */
        ember: {
          50: "#fbf8f1",
          100: "#f6efe1",
          200: "#ede0c4",
          300: "#ddc99e",
          400: "#c9ad76",
          500: "#b99352",
          600: "#a77e3c",
          700: "#8c672d",
          800: "#6e4f21",
        },
        /* Legacy name resolves to a quiet neutral, never a second accent. */
        royal: {
          50: "#f7f7f5",
          100: "#edede9",
          200: "#dcdcd6",
          300: "#b8b8b1",
          400: "#92928b",
          500: "#6f6f6a",
          600: "#4f4f4a",
          700: "#30302d",
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
          50: "#f6f6f6",
          100: "#e7e7e7",
          200: "#c9c9c9",
          300: "#a2a2a2",
          400: "#7a7a7a",
          500: "#565656",
          600: "#3c3c3c",
          700: "#282828",
          800: "#1a1a1a",
          900: "#101010",
          950: "#080808",
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
        "gold-gradient": "linear-gradient(100deg, #8c672d 0%, #b99352 52%, #a77e3c 100%)",
        "gold-sheen": "linear-gradient(120deg, rgba(185,147,82,0) 0%, rgba(185,147,82,.26) 50%, rgba(185,147,82,0) 100%)",
        "obsidian-gradient": "linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%)",
        "obsidian-soft": "linear-gradient(180deg, #242424 0%, #171717 100%)",
        "ivory-gradient": "linear-gradient(180deg, #ffffff 0%, #f8f5ef 100%)",
        /* Light-theme section washes — neutral rhythm, never colorful. */
        "paper-gradient": "linear-gradient(180deg, #fafaf8 0%, #f6f6f2 100%)",
        "paper-soft": "linear-gradient(180deg, #f7f7f4 0%, #f2f2ee 100%)",
        "card-sheen": "linear-gradient(180deg, #ffffff 0%, #fcfcfb 100%)",
        /* Public brand system — one warm accent plus charcoal contrast. */
        "brand-gradient": "linear-gradient(120deg, #8c672d 0%, #b99352 52%, #a77e3c 100%)",
        "brand-deep": "linear-gradient(150deg, #111111 0%, #1b1b1b 52%, #282828 100%)",
        "brand-ember": "linear-gradient(100deg, #8c672d 0%, #b99352 52%, #a77e3c 100%)",
        "tint-lavender": "linear-gradient(180deg, #fafaf8 0%, #f3f3ef 100%)",
        "tint-peach": "linear-gradient(180deg, #ffffff 0%, #f5f5f1 100%)",
        "tint-sky": "linear-gradient(180deg, #fbfbfa 0%, #efefeb 100%)",
      },
      boxShadow: {
        luxe: "0 1px 2px rgba(17,17,17,.05), 0 24px 60px -28px rgba(17,17,17,.22)",
        card: "0 1px 2px rgba(17,17,17,.04), 0 10px 28px -14px rgba(17,17,17,.10)",
        lift: "0 2px 4px rgba(17,17,17,.05), 0 26px 52px -22px rgba(17,17,17,.18)",
        gold: "0 18px 50px -22px rgba(185,147,82,.34)",
        "gold-sm": "0 10px 30px -18px rgba(185,147,82,.28)",
        brand: "0 18px 50px -20px rgba(185,147,82,.34)",
        "brand-sm": "0 10px 30px -14px rgba(185,147,82,.28)",
        ember: "0 18px 50px -22px rgba(185,147,82,.28)",
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
