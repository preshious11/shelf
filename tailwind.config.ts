import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          light: "#FBFBFA",
          dark: "#0C0C0E",
        },
        surface: {
          light: "#FFFFFF",
          dark: "#16161A",
          muted: {
            light: "#F4F4F3",
            dark: "#1F1F24",
          }
        },
        border: {
          subtle: {
            light: "#E5E5E3",
            dark: "#26262B",
          },
          strong: {
            light: "#D4D4D1",
            dark: "#383840",
          }
        },
        ink: {
          primary: {
            light: "#18181B",
            dark: "#F4F4F5",
          },
          muted: {
            light: "#71717A",
            dark: "#A1A1AA",
          },
          subtle: {
            light: "#A1A1AA",
            dark: "#71717A",
          }
        },
        accent: {
          DEFAULT: "#0284C7",
          hover: "#0369A1",
          light: "#E0F2FE",
          dark: "#38BDF8",
          darkHover: "#7DD3FC",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      maxWidth: {
        reading: "72ch",
      },
    },
  },
  plugins: [],
};

export default config;
