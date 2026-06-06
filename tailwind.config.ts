/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        amazon: {
          yellow:  "#FFD814",
          orange:  "#FFA41C",
          dark:    "#131921",
          navy:    "#232F3E",
          blue:    "#37475A",
          light:   "#EAEDED",
          link:    "#007185",
          hover:   "#C7511F",
          green:   "#067D62",
        },
      },
      fontFamily: {
        sans: ["'Amazon Ember'", "Arial", "sans-serif"],
      },
      keyframes: {
        "slide-in": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to:   { transform: "translateX(0)",    opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0"  },
        },
      },
      animation: {
        "slide-in": "slide-in 0.3s ease-out",
        "fade-in":  "fade-in 0.4s ease-out",
        shimmer:    "shimmer 1.5s infinite linear",
      },
    },
  },
  plugins: [],
};