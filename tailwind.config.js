/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/ui/**/*.{html,js}",
    "./dist/ui/**/*.{html,js}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["light", "dark"],
    styled: true,
    base: true,
    utils: true,
  },
}
