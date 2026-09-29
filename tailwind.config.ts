import type { Config } from "tailwindcss";

// Alfred design tokens.
// Alfred is a quiet private secretary, so the palette stays calm: a cool,
// slightly green paper; deep moss as the one brand colour; and three
// meaning-carrying accents that are never used decoratively:
//   rust  = money owed / hot   brass = warm   slate = cold
// Existing token names (paper, surface, ink, line, moss, rust) are kept so
// current pages keep working; `fill` (input/chip background), `brass` and
// `slate` are new.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F2F4F0",
        surface: "#FFFFFF",
        fill: "#E7EAE4",
        ink: "#141F1A",
        "ink-soft": "#5A6660",
        line: "#DCE0D9",
        moss: { DEFAULT: "#1F5A40", soft: "#E1EDE6" },
        rust: { DEFAULT: "#B4533C", soft: "#F5E7E2" },
        brass: { DEFAULT: "#8F6F1F", soft: "#F3EBD3" },
        slate: { DEFAULT: "#46657F", soft: "#E2EAF0" },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-work-sans)", "sans-serif"],
      },
      keyframes: {
        "toast-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // The one orchestrated moment: the daily briefing settles in.
        rise: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "toast-in": "toast-in 200ms cubic-bezier(.33,1,.68,1)",
        rise: "rise 320ms cubic-bezier(.23,1,.32,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
