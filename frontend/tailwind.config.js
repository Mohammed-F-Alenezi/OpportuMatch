/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "var(--brand)",
          alt: "var(--brand-alt)",
        },
        dark: {
          bg: "var(--dark-bg)",
          surface: "var(--dark-surface)",
          alt: "var(--dark-alt)",
        },
        light: {
          bg: "var(--light-bg)",
          surface: "var(--light-surface)",
          alt: "var(--light-alt)",
        },
        success: "var(--success)",
        border: {
          dark: "var(--border-dark)",
          light: "var(--border-light)",
        },
        text: {
          dark: "var(--text-dark)",
          light: "var(--text-light)",
        },
        subtext: {
          dark: "var(--subtext-dark)",
          light: "var(--subtext-light)",
        },
        /* hook into shadcn defaults */
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        input: "var(--input)",
        ring: "var(--ring)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        soft: "0 6px 24px -8px rgba(0,0,0,.25)",
      },
    },
  },
  plugins: [],
};
