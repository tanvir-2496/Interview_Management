import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f7f4",
          100: "#ddece3",
          500: "#2d6a4f",
          700: "#1b4332"
        }
      }
    }
  },
  plugins: []
} satisfies Config;
