import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: { extend: { colors: { brand: '#356d5d' } } },
  plugins: [],
} satisfies Config;
