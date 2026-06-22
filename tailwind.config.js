/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Voicedo ブランドカラー（plan.md より）
        moss: "#2A6F5F",
        cream: "#F4E4C1",
        sunrise: "#FF8C5A",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        rounded: ["var(--font-rounded)"],
      },
    },
  },
  plugins: [],
};
