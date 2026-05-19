/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "#F4D360",
          50: "#FFFDF5",
          100: "#FCF6DE",
          200: "#FAEBB8",
          300: "#F7E08F",
          400: "#F4D360",
          500: "#E9C13B",
          600: "#C9A12A",
          700: "#9C7C1D",
          800: "#6C5612",
          900: "#3D3008"
        },
        accent: {
          DEFAULT: "#C0392B",
          50: "#FBEBE9",
          100: "#F5CFCB",
          200: "#EAA29B",
          300: "#DE756B",
          400: "#D2493D",
          500: "#C0392B",
          600: "#9C2E23",
          700: "#76231B",
          800: "#511812",
          900: "#2B0D09"
        },
        ink: {
          DEFAULT: "#23272A",
          900: "#0F1112",
          800: "#1A1D1F",
          700: "#23272A",
          600: "#3A3F44",
          500: "#5A6168"
        },
        cream: {
          DEFAULT: "#FFFDF5",
          50: "#FFFFFF",
          100: "#FFFDF5",
          200: "#FBF6E3"
        }
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Playfair Display", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "DM Sans", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 1px 2px rgba(35,39,42,0.04), 0 8px 24px rgba(35,39,42,0.08)"
      }
    }
  },
  plugins: []
};
