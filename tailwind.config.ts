import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      terminal: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        bg: {
          primary: "#06060b",
          card: "#0d0d14",
          elevated: "#14141f",
          hover: "#1a1a28",
        },
        border: {
          DEFAULT: "#1a1a2a",
          hover: "#2a2a44",
        },
        text: {
          primary: "#e8e8f0",
          secondary: "#8888a0",
          muted: "#555568",
          faint: "#333340",
        },
        green: {
          DEFAULT: "#00ff88",
          dim: "#00ff8810",
        },
        red: {
          DEFAULT: "#ff3b5c",
          dim: "#ff3b5c10",
        },
        amber: {
          DEFAULT: "#ffaa00",
          dim: "#ffaa0010",
        },
        blue: {
          DEFAULT: "#3b82f6",
        },
        accent: {
          DEFAULT: "#7c4dff",
          hover: "#651fff",
          bg: "#7c4dff12",
        },
      },
      fontFamily: {
        sans: ["var(--font-lexend)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      maxWidth: {
        app: "480px",
        terminal: "1400px",
        explore: "960px",
      },
      borderRadius: {
        card: "12px",
        btn: "8px",
      },
      keyframes: {
        "pulse-new": {
          "0%": { backgroundColor: "rgba(0, 255, 136, 0.08)" },
          "50%": { backgroundColor: "rgba(0, 255, 136, 0.03)" },
          "100%": { backgroundColor: "rgba(0, 255, 136, 0)" },
        },
      },
      animation: {
        "pulse-new": "pulse-new 2s ease-out forwards",
      },
    },
  },
  plugins: [],
};
export default config;
