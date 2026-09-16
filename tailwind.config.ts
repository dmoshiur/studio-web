import type { Config } from "tailwindcss";

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
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        "2xl": "1200px",
      },
    },
    extend: {
      colors: {
        // ManUp brand DNA (from original Colorlib template)
        brand: {
          50: "#fef2f7",
          100: "#fde6ef",
          200: "#fbcdde",
          1000: "#171822",
          300: "#f7a4c2",
          400: "#f2749f",
          500: "#f9488b", // primary pink
          600: "#e42a72",
          700: "#c2185c",
          800: "#9d1750",
          900: "#7c1746",
        },
        ember: {
          400: "#f5a83d",
          500: "#ee8425", // secondary orange
          600: "#d96f14",
        },
        ink: {
          DEFAULT: "#171822", // dark base
          50: "#f4f5f7",
          100: "#e7e7e8",
          200: "#c9cad2",
          300: "#a3a3ae",
          400: "#a0a1b5", // muted text
          500: "#6a6b7c",
          600: "#45464e",
          700: "#2a2b36",
          800: "#1e1f2a",
          900: "#171822",
          950: "#0f1018",
        },
        danger: "#f44949",
      },
      fontFamily: {
        display: ["Work Sans", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        sans: ["Poppins", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(120deg, #ee8425 0%, #f9488b 100%)",
        "brand-gradient-soft":
          "linear-gradient(120deg, rgba(238,132,37,.12) 0%, rgba(249,72,139,.12) 100%)",
        "ink-gradient": "linear-gradient(180deg, #1e1f2a 0%, #171822 100%)",
      },
      boxShadow: {
        card: "0 1px 2px rgba(23,24,34,.06), 0 8px 24px -12px rgba(23,24,34,.18)",
        pop: "0 12px 40px -12px rgba(249,72,139,.45)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fade: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up .6s cubic-bezier(.22,.61,.36,1) both",
        fade: "fade .4s ease both",
        "scale-in": "scale-in .25s ease both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

// tailwindcss-animate is optional; guard if missing
export default config;
