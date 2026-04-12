import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#ffffff",
        foreground: "#0f172a",
        card: {
          DEFAULT: "#ffffff",
          foreground: "#0f172a",
        },
        popover: {
          DEFAULT: "#ffffff",
          foreground: "#0f172a",
        },
        primary: {
          DEFAULT: "#0d9488",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#f1f5f9",
          foreground: "#0f172a",
        },
        muted: {
          DEFAULT: "#f1f5f9",
          foreground: "#64748b",
        },
        accent: {
          DEFAULT: "#f1f5f9",
          foreground: "#0f172a",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        border: "#e2e8f0",
        input: "#cbd5e1",
        ring: "#0d9488",
        chart: {
          "1": "#f97316",
          "2": "#14b8a6",
          "3": "#0f766e",
          "4": "#f59e0b",
          "5": "#fb923c",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      keyframes: {
        "hero-orb": {
          "0%, 100%": {
            opacity: "0.35",
            transform: "translate3d(0, 0, 0) scale(1)",
          },
          "40%": {
            opacity: "0.55",
            transform: "translate3d(-3%, 5%, 0) scale(1.06)",
          },
          "70%": {
            opacity: "0.42",
            transform: "translate3d(2%, -3%, 0) scale(0.98)",
          },
        },
        "hero-orb-soft": {
          "0%, 100%": {
            opacity: "0.22",
            transform: "translate3d(0, 0, 0) scale(1)",
          },
          "50%": {
            opacity: "0.4",
            transform: "translate3d(5%, -6%, 0) scale(1.1)",
          },
        },
      },
      animation: {
        "hero-orb": "hero-orb 18s ease-in-out infinite",
        "hero-orb-soft": "hero-orb-soft 22s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
