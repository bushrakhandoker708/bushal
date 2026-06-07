// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}", "./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bushal: {
          forest:      "#1B3A2D",
          forestMid:   "#2D5A42",
          forestLight: "#3D7A5A",
          copper:      "#B87333",
          copperLight: "#D4954A",
          copperGlow:  "#F0B96A",
          ivory:       "#F9F6F0",
          ivoryDeep:   "#F0EBE1",
          surface:     "#FFFFFF",
          ink:         "#1A1A18",
          inkMid:      "#3D3D3A",
          inkSoft:     "#6B6B65",
          border:      "#E0D9CE",
          borderMid:   "#C8BFB0",
          success:     "#2A7A4E",
          successBg:   "#E8F5EE",
          danger:      "#C0392B",
          dangerBg:    "#FDECEA",
          warning:     "#B07D2A",
          warningBg:   "#FEF6E4",
        },
      },
      fontFamily: {
        heading: ["'Cormorant Garamond'", "Georgia", "serif"],
        body:    ["'DM Sans'", "system-ui", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem" }],
      },
      borderRadius: {
        DEFAULT: "12px",
        sm:      "8px",
        md:      "12px",
        lg:      "16px",
        xl:      "20px",
        "2xl":   "24px",
      },
      boxShadow: {
        card:       "0 1px 4px rgba(27, 58, 45, 0.06), 0 4px 16px rgba(27, 58, 45, 0.04)",
        cardHover:  "0 4px 16px rgba(27, 58, 45, 0.10), 0 12px 40px rgba(27, 58, 45, 0.06)",
        copper:     "0 6px 20px rgba(184, 115, 51, 0.28)",
        copperHover:"0 10px 30px rgba(184, 115, 51, 0.38)",
        inset:      "inset 0 1px 3px rgba(27, 58, 45, 0.08)",
      },
      animation: {
        "fade-up":    "fadeUp 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in":    "fadeIn 0.3s ease-out forwards",
        "scale-in":   "scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-right":"slideRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "bounce-pop": "bouncePop 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "shimmer":    "shimmer 1.8s infinite linear",
        "shake":      "shake 0.35s ease-in-out",
        "pulse-soft": "pulseSoft 2.8s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%":   { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideRight: {
          "0%":   { opacity: "0", transform: "translateX(100%)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        bouncePop: {
          "0%":   { transform: "scale(0.3)", opacity: "0" },
          "50%":  { transform: "scale(1.06)" },
          "70%":  { transform: "scale(0.92)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-5px)" },
          "40%": { transform: "translateX(5px)" },
          "60%": { transform: "translateX(-3px)" },
          "80%": { transform: "translateX(3px)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.55" },
        },
      },
      backgroundImage: {
        "ivory-grain": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%23F9F6F0'/%3E%3Crect x='0' y='0' width='1' height='1' fill='%23F0EBE1' opacity='0.6'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

export default config;