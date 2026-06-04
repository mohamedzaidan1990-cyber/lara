/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // ===== Candy theme =====
        // "gold" is kept as a token name for backwards-compat but now maps to
        // the soft pink container (primary-fixed) used for badges/highlights.
        gold: {
          DEFAULT: "#ffd6ee",
          50: "#fff5fb",
          100: "#ffe6f4",
          200: "#ffd6ee",
          300: "#f9bfe0",
          400: "#f080c0",
          500: "#e85cae",
          600: "#e040a0",
          700: "#c62f88",
          800: "#a02070",
          900: "#4d0f37"
        },
        // "accent" = candy primary (hot pink), used for CTAs + brand.
        accent: {
          DEFAULT: "#e040a0",
          50: "#fdeaf6",
          100: "#fbd3ec",
          200: "#f6a8d8",
          300: "#f080c0",
          400: "#e85cae",
          500: "#e040a0",
          600: "#c62f88",
          700: "#a02070",
          800: "#7a1857",
          900: "#4d0f37"
        },
        // "ink" = on-surface text (warm plum-charcoal) + variants for muted text.
        ink: {
          DEFAULT: "#2e1a28",
          900: "#1f1019",
          800: "#261520",
          700: "#2e1a28",
          600: "#604868",
          500: "#907898"
        },
        // "cream" = the warm pink-white background canvas.
        cream: {
          DEFAULT: "#fef7ff",
          50: "#ffffff",
          100: "#fef7ff",
          200: "#fbf2fb"
        },
        // Candy accents available directly when needed.
        secondary: "#7c52aa",
        tertiary: "#0096cc",
        surface: "#fef7ff",
        "surface-container": "#f8eef8",
        outline: "#907898"
      },
      fontFamily: {
        // The candy system is single-typeface (DM Sans). "serif" is retained as
        // a token so existing font-serif usages keep working, but renders DM Sans.
        serif: ["var(--font-dm-sans)", "DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-dm-sans)", "DM Sans", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 2px 8px rgba(224,64,160,0.06), 0 12px 32px rgba(224,64,160,0.10)",
        pop: "0 25px 50px -12px rgba(224,64,160,0.18)"
      }
    }
  },
  plugins: []
};
