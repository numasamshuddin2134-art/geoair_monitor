import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        hud: {
          bg: "#05070a",
          surface: "#070c14",
          panel: "#0a111c",
          panelHover: "#0e1826",
          border: "#162536",
          borderBright: "#1f3b5c",
          cyan: "#00e5ff",
          cyanDim: "rgba(0, 229, 255, 0.15)",
          cyanGlow: "rgba(0, 229, 255, 0.4)",
          amber: "#ffb000",
          amberDim: "rgba(255, 176, 0, 0.15)",
          red: "#ff3b3b",
          redDim: "rgba(255, 59, 59, 0.15)",
          green: "#00ff9c",
          greenDim: "rgba(0, 255, 156, 0.15)",
          muted: "#627d98",
          text: "#d9e2ec",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "IBM Plex Mono", "Courier New", "monospace"],
        hud: ["Rajdhani", "Orbitron", "Inter", "sans-serif"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      backgroundImage: {
        "hud-grid": "radial-gradient(rgba(0, 229, 255, 0.08) 1px, transparent 0)",
        "hud-scanline": "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 229, 255, 0.015) 2px, rgba(0, 229, 255, 0.015) 4px)",
      },
      boxShadow: {
        "hud-cyan": "0 0 15px rgba(0, 229, 255, 0.25), inset 0 0 15px rgba(0, 229, 255, 0.08)",
        "hud-cyan-lg": "0 0 25px rgba(0, 229, 255, 0.4), inset 0 0 20px rgba(0, 229, 255, 0.15)",
        "hud-amber": "0 0 15px rgba(255, 176, 0, 0.3)",
        "hud-red": "0 0 15px rgba(255, 59, 59, 0.35)",
        "hud-green": "0 0 15px rgba(0, 255, 156, 0.3)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "scan-line": "scanline 8s linear infinite",
        "radar-sweep": "radar 4s linear infinite",
      },
      keyframes: {
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(1000%)" },
        },
        radar: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
