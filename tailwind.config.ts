import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", "class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      /* 🌈 NEBULA COLOR SYSTEM */
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        panel: "var(--panel)",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },

        /* 🌌 Nebula brand gradient tones */
        "nebula-1": "#60a5fa", // sky-blue
        "nebula-2": "#6366f1", // indigo
        "nebula-accent": "#7dd3fc", // light cyan
      },

      /* 🌀 NEBULA BORDERS & RADII */
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      /* 🌟 NEBULA SHADOWS */
      boxShadow: {
        "nebula-sm": "0 2px 10px rgba(14, 165, 233, 0.15)",
        "nebula-lg": "0 10px 40px rgba(56, 189, 248, 0.25)",
        glow: "0 0 40px rgba(99, 102, 241, 0.4)",
      },

      /* ✨ NEBULA ANIMATIONS */
      keyframes: {
        "nebula-border": {
          "0%,100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "pulse-glow": {
          "0%,100%": {
            opacity: "0.6",
            transform: "scale(1)",
            filter: "blur(40px)",
          },
          "50%": {
            opacity: "1",
            transform: "scale(1.05)",
            filter: "blur(60px)",
          },
        },
      },

      animation: {
        "nebula-border": "nebula-border 6s ease infinite",
        "pulse-glow": "pulse-glow 4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
