import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "#45B96B",
        "primary-dark": "#23894A",
        accent: "#F1F4F0",
        border: "#D9E2D8",
        ink: "#101511",
      },
      boxShadow: {
        card: "0 18px 45px rgba(16, 47, 27, .12)",
        lift: "0 12px 0 rgba(23, 91, 43, .18), 0 24px 38px rgba(16, 47, 27, .18)",
      },
    },
  },
  plugins: [],
};
export default config;
