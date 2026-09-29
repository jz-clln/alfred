import type { Config } from "tailwindcss";

// Design tokens for the app. Kept intentional and specific to a personal
// business ledger, rather than default SaaS-dashboard colors:
// - paper: warm off-white background, not stark white
// - ink: near-black with a green undertone for body text
// - moss: the single primary accent (growth / money in)
// - rust: sparing secondary accent (money owed / attention)
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF9F6",
        surface: "#FFFFFF",
        ink: "#1C2321",
        "ink-soft": "#5B6663",
        line: "#E4E1D8",
        moss: {
          DEFAULT: "#2F6F4E",
          soft: "#E7F0EA",
        },
        rust: {
          DEFAULT: "#B4533C",
          soft: "#F5E7E2",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-work-sans)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
