/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        pitch: "0 24px 70px rgba(2, 44, 34, 0.35)",
      },
    },
  },
  plugins: [],
};
