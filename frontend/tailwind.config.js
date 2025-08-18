/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1B8354",
          alt: "#145E3D",
        },
        // Neutrals + surfaces
        dark: { bg: "#111927", surface: "#1F2A37", alt: "#0D3D27" },
        light: { bg: "#ECF3F6", surface: "#FFFFFF", alt: "#F3F7FA" },
        success: "#C1E4C1",
        border: { dark: "#263241", light: "#D1D5DB" },
        text: { dark: "#E5E7EB", light: "#0F172A" },
        subtext: { dark: "#9CA3AF", light: "#475569" },
      },
      borderRadius: { xl: "1rem", "2xl": "1.25rem", "3xl": "1.75rem" },
      boxShadow: { soft: "0 6px 24px -8px rgba(0,0,0,.25)" },
    },
  },
  plugins: [],
};
