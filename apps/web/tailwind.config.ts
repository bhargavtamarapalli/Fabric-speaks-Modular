import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--fs-surface-1)",
        foreground: "var(--fs-text-primary)",
        fs: {
          navy: "var(--fs-navy)",
          teal: "var(--fs-teal)",
          "teal-dk": "var(--fs-teal-dk)",
          "teal-lt": "var(--fs-teal-lt)",
          "teal-lt2": "var(--fs-teal-lt2)",
          success: "var(--fs-success)",
          "success-lt": "var(--fs-success-lt)",
          warning: "var(--fs-warning)",
          "warning-lt": "var(--fs-warning-lt)",
          error: "var(--fs-error)",
          "error-lt": "var(--fs-error-lt)",
          info: "var(--fs-info)",
          "info-lt": "var(--fs-info-lt)",
          void: "var(--fs-void)",
          linen: "var(--fs-linen)",
          ivory: "var(--fs-ivory)",
          ash: "var(--fs-ash)",
          surface: {
            0: "var(--fs-surface-0)",
            1: "var(--fs-surface-1)",
            2: "var(--fs-surface-2)",
            inv: "var(--fs-surface-inv)"
          },
          text: {
            primary: "var(--fs-text-primary)",
            secondary: "var(--fs-text-secondary)",
            disabled: "var(--fs-text-disabled)"
          }
        }
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)"],
        serif: ["var(--font-dm-serif)"],
        mono: ["var(--font-dm-mono)"]
      }
    },
  },
  plugins: [],
};
export default config;
