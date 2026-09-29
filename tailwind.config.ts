import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

// Alfred design tokens (Carbon / Alabaster / Linen / Platinum / Ghost).
// Existing class names (paper, surface, fill, ink, ink-soft, line, moss,
// rust, brass, slate) keep working. shadcn semantic tokens (background,
// primary, muted, ...) point at the same colours through CSS variables in
// globals.css, stored as "R G B" channels so opacity modifiers like
// bg-primary/90 work.
//
// CHANGED: rust and brass darkened so small text on their soft chips passes
// WCAG AA 4.5:1 (old values measured about 4.1:1 and 3.95:1). Revert the two
// DEFAULT values below if you prefer the old look.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ---- the palette, in full ----
        carbon_black: {
          DEFAULT: "#1c1c1c", 100: "#060606", 200: "#0b0b0b", 300: "#111111",
          400: "#161616", 500: "#1c1c1c", 600: "#494949", 700: "#777777",
          800: "#a4a4a4", 900: "#d2d2d2",
        },
        alabaster_grey: {
          DEFAULT: "#daddd8", 100: "#2b2f29", 200: "#565e52", 300: "#828c7b",
          400: "#aeb5aa", 500: "#daddd8", 600: "#e2e4e0", 700: "#e9ebe8",
          800: "#f1f2f0", 900: "#f8f8f7",
        },
        soft_linen: {
          DEFAULT: "#ecebe4", 100: "#363427", 200: "#6d684d", 300: "#9f9a78",
          400: "#c5c2ae", 500: "#ecebe4", 600: "#f0efea", 700: "#f4f3ef",
          800: "#f7f7f4", 900: "#fbfbfa",
        },
        platinum: {
          DEFAULT: "#eef0f2", 100: "#2a3036", 200: "#53606c", 300: "#81909e",
          400: "#b8c0c8", 500: "#eef0f2", 600: "#f1f3f4", 700: "#f5f6f7",
          800: "#f8f9fa", 900: "#fcfcfc",
        },
        ghost_white: {
          DEFAULT: "#fafaff", 100: "#000065", 200: "#0000ca", 300: "#3030ff",
          400: "#9595ff", 500: "#fafaff", 600: "#fbfbff", 700: "#fcfcff",
          800: "#fdfdff", 900: "#fefeff",
        },

        // ---- app tokens (existing class names keep working) ----
        paper: "#f4f3ef",
        surface: "#fafaff",
        fill: "#e2e4e0",
        ink: "#1c1c1c",
        "ink-soft": "#494949",
        line: "#daddd8",
        moss: { DEFAULT: "#1c1c1c", soft: "#daddd8" },

        // ---- meaning-only accents ----
        rust: { DEFAULT: "#9F4530", soft: "#F5E7E2" },
        brass: { DEFAULT: "#7A5C14", soft: "#F3EBD3" },
        slate: { DEFAULT: "#46657F", soft: "#E2EAF0" },

        // ---- shadcn semantic tokens ----
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "rgb(var(--card) / <alpha-value>)",
          foreground: "rgb(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "rgb(var(--popover) / <alpha-value>)",
          foreground: "rgb(var(--popover-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "rgb(var(--secondary) / <alpha-value>)",
          foreground: "rgb(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "rgb(var(--muted) / <alpha-value>)",
          foreground: "rgb(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          foreground: "rgb(var(--accent-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "rgb(var(--destructive) / <alpha-value>)",
          foreground: "rgb(var(--destructive-foreground) / <alpha-value>)",
        },
        border: "rgb(var(--border) / <alpha-value>)",
        input: "rgb(var(--input) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
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
  plugins: [animate],
};

export default config;
