/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#f5f6f8",
        surface: "#ffffff",
        line: "#e7e8ee",
        "line-soft": "#eef0f4",
        ink: "#1c1e26",
        muted: "#6b7080",
        faint: "#9a9eb0",
        primary: { DEFAULT: "#5b5bf0", ink: "#ffffff" },
        // Per-stage hue, shared by the column header dot and the card status badge.
        stage: {
          open: "#7b8194",
          todo: "#d98a1f",
          prog: "#2f7be0",
          rev: "#8b5cf6",
          done: "#1f9d6b",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,22,30,.04)",
        "card-hover": "0 8px 20px -10px rgba(20,22,30,.22)",
        primary: "0 6px 16px -6px rgba(91,91,240,.6)",
      },
      borderRadius: {
        card: "12px",
        lane: "14px",
      },
    },
  },
  plugins: [],
};
