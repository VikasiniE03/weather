/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        command: {
          bg: "#F8F9FA",
          panel: "#FFFFFF",
          card: "#FFFFFF",
          border: "#E4E4E7",
          highlight: "#F4F4F5"
        },
        telemetry: {
          dark: "#18181B",
          slate: "#475569",
          gray: "#71717A",
          lightGray: "#E4E4E7",
          rose: "#E11D48"
        }
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"]
      },
      boxShadow: {
        soft: "0 2px 8px -2px rgba(0, 0, 0, 0.05)",
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
        glowRose: "0 0 20px -2px rgba(225, 29, 72, 0.25)"
      },
      animation: {
        pulseFast: "pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        ripple: "ripple 2s linear infinite"
      },
      keyframes: {
        ripple: {
          "0%": { transform: "scale(0.8)", opacity: "1" },
          "100%": { transform: "scale(2.4)", opacity: "0" }
        }
      }
    }
  },
  plugins: []
};
