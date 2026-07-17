/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b1220",
        card: "#141d30",
        card2: "#1b2742",
        accent: "#6366f1",
        accent2: "#f59e0b"
      }
    }
  },
  plugins: []
};
