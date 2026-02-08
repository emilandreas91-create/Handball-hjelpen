/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#00f3ff", // Neon Blue
        secondary: "#ff6600", // Neon Orange
        background: "#0a0a0a", // Dark Background
        card: "#1a1a1a",
        text: "#ffffff",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'hero-pattern': "radial-gradient(circle at center, #1a1a2e 0%, #000000 100%)",
        'grid-pattern': `linear-gradient(45deg, transparent 48%, var(--tw-colors-primary) 49%, var(--tw-colors-primary) 51%, transparent 52%),
                         linear-gradient(-45deg, transparent 48%, var(--tw-colors-secondary) 49%, var(--tw-colors-secondary) 51%, transparent 52%)`,
      },
    },
  },
  plugins: [],
}
