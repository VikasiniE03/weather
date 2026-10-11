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
          bg: "#0B0F17",
          panel: "#111827",
          card: "#162032",
          border: "#1F2E45",
          highlight: "#2B3F5E"
        },
        telemetry: {
          cyan: "#06B6D4",
          emerald: "#10B981",
          amber: "#F59E0B",
          rose: "#F43F5E",
          purple: "#8B5CF6"
        }
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"]
      },
      boxShadow: {
        glowCyan: "0 0 20px -3px rgba(6, 182, 212, 0.35)",
        glowRose: "0 0 25px -2px rgba(244, 63, 94, 0.45)",
        glowEmerald: "0 0 20px -3px rgba(16, 185, 129, 0.35)"
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
