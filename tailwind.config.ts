import type { Config } from "tailwindcss";

/**
 * Tranzo Professional design tokens.
 * Corporate navy + gold system: deep navy surfaces, a single gold accent,
 * cool slate light canvas (#f8fafc) and Poppins/Inter typography.
 * Derived from the tranzobd.netlify.app design language — confident,
 * trust-building and unmistakably professional.
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
        /* Brand gold — the single accent (CTAs, labels, highlights). */
        gold: {
          50: "#FFF9E6",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FACC15",
          500: "#EAB308",
          600: "#E6B325",
          700: "#A16207",
          800: "#854D0E",
          900: "#713F12",
          950: "#0F1E36",
        },
        /* Legacy names intentionally resolve to the same single accent. */
        brand: {
          50: "#FFF9E6",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FACC15",
          500: "#EAB308",
          600: "#E6B325",
          700: "#A16207",
          800: "#854D0E",
          900: "#713F12",
          950: "#0F1E36",
        },
        ember: {
          50: "#FFF9E6",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FACC15",
          500: "#EAB308",
          600: "#E6B325",
          700: "#A16207",
          800: "#854D0E",
          900: "#713F12",
        },
        /* Corporate navy — headers, footers, dark bands. */
        royal: {
          50: "#EFF3FA",
          100: "#D9E2F2",
          200: "#B8C7E2",
          300: "#8AA0CC",
          400: "#5B77B3",
          500: "#2A4172",
          600: "#1E3566",
          700: "#183A72",
        },
        /* Cool slate light surfaces — the light-theme canvas. */
        paper: {
          DEFAULT: "#F8FAFC",
          50: "#FFFFFF",
          100: "#F8FAFC",
          200: "#F1F5F9",
          300: "#E8EEF7",
          400: "#D9E2F2",
        },
        /* Hairline borders for cards, tables and separators. */
        line: {
          DEFAULT: "#E2E8F0",
          strong: "#D9E2F2",
        },
        /* Neutral ink — slate typography on light. */
        ink: {
          DEFAULT: "#0F172A",
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
          950: "#0A1226",
        },
        /* Deep navy surfaces — hero, footer, contrast bands. */
        obsidian: {
          50: "#EFF3FA",
          100: "#D9E2F2",
          200: "#B8C7E2",
          300: "#8AA0CC",
          400: "#5B77B3",
          500: "#2A4172",
          600: "#1E3566",
          700: "#183A72",
          800: "#122244",
          900: "#111E38",
          950: "#0F1E36",
        },
        /* Cool near-whites — text on navy. */
        ivory: {
          50: "#FFFFFF",
          100: "#F8FAFC",
          200: "#F1F5F9",
          300: "#E2E8F0",
          400: "#CBD5E1",
          500: "#94A3B8",
          600: "#64748B",
        },
        crimson: {
          400: "#E11D48",
          500: "#BE123C",
          600: "#9F1239",
        },
        danger: "#DC2626",
        success: "#059669",
      },
      fontFamily: {
        serif: ["Poppins", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        script: ["Poppins", "ui-sans-serif", "system-ui", "sans-serif"],
        poppins: ["Poppins", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        /* Gold action gradient — primary buttons and highlights. */
        "gold-gradient": "linear-gradient(90deg, #EAB308 0%, #FACC15 100%)",
        "gold-sheen": "linear-gradient(120deg, rgba(234,179,8,0) 0%, rgba(250,204,21,.3) 50%, rgba(234,179,8,0) 100%)",
        /* Deep navy bands — hero, footer and CTA sections. */
        "obsidian-gradient": "linear-gradient(135deg, #0F1E36 0%, #1E3566 52%, #122244 100%)",
        "obsidian-soft": "linear-gradient(180deg, #122244 0%, #0F1E36 100%)",
        "ivory-gradient": "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
        /* Light-theme section washes — cool slate rhythm. */
        "paper-gradient": "linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)",
        "paper-soft": "linear-gradient(180deg, #F1F5F9 0%, #E8EEF7 100%)",
        "card-sheen": "linear-gradient(180deg, #ffffff 0%, #FAFBFD 100%)",
        /* Public brand system — gold accent plus corporate navy contrast. */
        "brand-gradient": "linear-gradient(90deg, #EAB308 0%, #FACC15 100%)",
        "brand-deep": "linear-gradient(135deg, #0F1E36 0%, #1E3566 52%, #122244 100%)",
        "brand-ember": "linear-gradient(90deg, #EAB308 0%, #FACC15 100%)",
        "tint-lavender": "linear-gradient(180deg, #FAFBFD 0%, #EFF3FA 100%)",
        "tint-peach": "linear-gradient(180deg, #FFFFFF 0%, #FFF9E6 100%)",
        "tint-sky": "linear-gradient(180deg, #FBFCFE 0%, #EFF4FB 100%)",
      },
      boxShadow: {
        /* Navy-tinted elevation — soft corporate depth. */
        luxe: "0 24px 70px rgba(30,53,102,0.14)",
        card: "0 10px 15px -3px rgba(15,23,42,0.05), 0 4px 6px -4px rgba(15,23,42,0.05)",
        lift: "0 18px 45px rgba(30,53,102,0.12)",
        gold: "0 18px 45px -15px rgba(234,179,8,0.45)",
        "gold-sm": "0 10px 25px -10px rgba(234,179,8,0.4)",
        brand: "0 15px 30px -5px rgba(30,53,102,0.3)",
        "brand-sm": "0 10px 20px -5px rgba(37,99,235,0.35)",
        ember: "0 15px 30px -8px rgba(234,179,8,0.4)",
        inset: "inset 0 1px 0 rgba(255,255,255,.6)",
      },
      borderRadius: {
        xl2: "1.25rem",
        xs: "2px",
      },
      letterSpacing: {
        luxe: "0.25em",
        wide2: "0.2em",
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
