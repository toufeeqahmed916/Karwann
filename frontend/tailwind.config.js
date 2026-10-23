/** Design tokens live here and in src/index.css. Keep in sync with design/tokens.md */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F4F4EE",
        card: "#FFFFFF",
        ink: "#16181D",
        mute: "#6B6F76",
        line: "#DEDED6",
        lime: { DEFAULT: "#C4F135", dark: "#9CC41A" },
        night: "#101319",
        crit: "#D93636",
        high: "#EF8A1F",
        wait: "#E3C21B",
        transit: "#2F6FDE",
        done: "#2E9D5B",
      },
      fontFamily: {
        display: ["Archivo", "system-ui", "sans-serif"],
        sans: ["Public Sans", "system-ui", "sans-serif"],
      },
      borderRadius: { ui: "6px", panel: "10px" },
    },
  },
  plugins: [],
};
