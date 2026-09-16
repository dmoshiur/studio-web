import type { Config } from "tailwindcss";

/**
 * ManUp — Maison Noir design tokens.
 * Obsidian surfaces, champagne gold accents, ivory editorial sections and
 * a serif/script typographic voice.
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
        ink: {
          DEFAULT: "#14141a",
          50: "#f7f7f8",
          100: "#ececed",
          200: "#d6d6d9",
          300: "#b0b0b6",
          400: "#8a8a92",
          500: "#63636c",
          600: "#45454d",
          700: "#2e2e36",
          800: "#1d1d24",
          900: "#14141a",
          950: "#0a0a0d",
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
      },
      boxShadow: {
        luxe: "0 1px 2px rgba(8,8,10,.06), 0 30px 60px -30px rgba(8,8,10,.35)",
        gold: "0 18px 50px -22px rgba(201,162,39,.55)",
        "gold-sm": "0 10px 30px -18px rgba(201,162,39,.5)",
        inset: "inset 0 1px 0 rgba(255,255,255,.06)",
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
