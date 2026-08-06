import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

export default {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: '#eab308',
          amber: '#f59e0b',
        },
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      addVariant('twilight', '.twilight &');
    }),
  ],
} satisfies Config;
