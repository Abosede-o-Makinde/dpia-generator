import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: [
          'var(--font-bricolage)',
          'var(--font-dm-sans)',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
        mono: ['var(--font-dm-mono)', 'ui-monospace', 'monospace'],
        heading: ['var(--font-dm-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        surface: 'hsl(var(--surface))',
        ink: 'hsl(var(--ink))',
        'section-wash': 'hsl(var(--section-wash))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        risk: {
          low: '#16a34a',
          medium: '#d97706',
          high: '#ea580c',
          critical: '#dc2626',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) * 0.8)',
        sm: 'calc(var(--radius) * 0.6)',
        '2xl': 'calc(var(--radius) * 1.8)',
        '3xl': 'calc(var(--radius) * 2.2)',
      },
      boxShadow: {
        portal: '0 8px 40px -12px rgba(15, 23, 42, 0.08)',
        soft: '0 4px 16px -10px rgba(15, 23, 42, 0.25)',
      },
    },
  },
  plugins: [],
};

export default config;
