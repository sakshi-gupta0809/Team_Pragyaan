/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FFE900',
        secondary: '#FCFCFC',
        dark: '#2F2F2F',
        brand: {
          yellow: '#FFE900',
          white: '#FCFCFC',
          dark: '#2F2F2F'
        },
        neutrino: {
          blue: {
            light: '#4299e1',
            DEFAULT: '#3182ce',
            dark: '#2c5282'
          },
          green: {
            light: '#48bb78',
            DEFAULT: '#38a169',
            dark: '#2f855a'
          },
          orange: {
            light: '#FFA366',
            DEFAULT: '#FF8000',
            dark: '#CC6600'
          }
        },
        dashboard: {
          blue: {
            light: '#93C5FD',
            DEFAULT: '#3B82F6',
            dark: '#1D4ED8'
          },
          green: {
            light: '#86EFAC',
            DEFAULT: '#22C55E',
            dark: '#15803D'
          },
          orange: {
            light: '#FDBA74',
            DEFAULT: '#F97316',
            dark: '#C2410C'
          }
        }
      }
    },
  },
  plugins: [],
}
