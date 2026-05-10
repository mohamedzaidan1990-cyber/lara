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
          DEFAULT: "#B8952A",
          50: "#FBF7EC",
          100: "#F4ECD0",
          200: "#E6D597",
          300: "#D4B95E",
          400: "#C2A33A",
          500: "#B8952A",
          600: "#947623",
          700: "#6F591B",
          800: "#4B3C12",
          900: "#261E09"
        },
        ink: {
          DEFAULT: "#1A1713",
          900: "#0E0C0A",
          800: "#1A1713",
          700: "#2C2823",
          600: "#4A443D"
        }
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Playfair Display", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "DM Sans", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 1px 2px rgba(26,23,19,0.04), 0 8px 24px rgba(26,23,19,0.06)"
      }
    }
  },
  plugins: []
};
