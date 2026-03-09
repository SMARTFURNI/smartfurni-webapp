import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        gold: { DEFAULT: "#C9A84C", light: "#E2C97E", dark: "#9A7A2E" },
        dark: { DEFAULT: "#0D0B00", surface: "#1A1600", card: "#221D00", border: "#2E2800" },
      },
      fontFamily: { sans: ["Inter", "sans-serif"] },
      animation: {
        "float": "float 6s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "slide-up": "slideUp 0.6s ease-out",
        "fade-in": "fadeIn 0.8s ease-out",
      },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-12px)" } },
        glow: { from: { boxShadow: "0 0 20px #C9A84C40" }, to: { boxShadow: "0 0 40px #C9A84C80" } },
        slideUp: { from: { opacity: "0", transform: "translateY(30px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
      },
    },
  },
  plugins: [],
};
export default config;
