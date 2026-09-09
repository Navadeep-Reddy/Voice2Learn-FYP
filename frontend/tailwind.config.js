/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F7F9FB",
        surface: "#FFFFFF",
        subtle: "#F2F4F6",
        line: "#E0E3E5",
        ink: "#191C1E",
        muted: "#424754",
        brand: "#0057C2",
        brandbright: "#0D6EF0",
        leaf: "#60FE6C",
        leafdark: "#00731D",
        sunny: "#FFE171",
        sunnydark: "#705D00",
        redsoft: "#FFDAD6",
        redder: "#BA1A1A",
      },
      fontFamily: {
        sans: ["Quicksand", "ui-rounded", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
