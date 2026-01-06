/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Cela dit à Tailwind de regarder tes fichiers React
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}