const { hairlineWidth } = require('nativewind/theme');

/** Reference a Counter DS CSS variable with Tailwind alpha support. */
const token = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // Class-based dark mode so the app can switch light/dark/system manually
  // via NativeWind's setColorScheme (required on web; consistent on native).
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: token('background'),
        surface: {
          DEFAULT: token('surface'),
          sunken: token('surface-sunken'),
          elevated: token('surface-elevated'),
        },
        hairline: token('hairline'),
        ink: {
          DEFAULT: token('ink'),
          secondary: token('ink-secondary'),
          tertiary: token('ink-tertiary'),
        },
        primary: {
          DEFAULT: token('primary'),
          tint: token('primary-tint'),
        },
        'on-primary': token('on-primary'),
        positive: { DEFAULT: token('positive'), tint: token('positive-tint') },
        caution: { DEFAULT: token('caution'), tint: token('caution-tint') },
        negative: { DEFAULT: token('negative'), tint: token('negative-tint') },
        info: { DEFAULT: token('info'), tint: token('info-tint') },
      },
      borderRadius: {
        xs: '8px',
        sm: '12px',
        md: '16px',
        DEFAULT: '16px',
        lg: '20px',
        xl: '24px',
        '2xl': '32px',
      },
      fontFamily: {
        sans: ['Inter_400Regular'],
        'sans-medium': ['Inter_500Medium'],
        'sans-semibold': ['Inter_600SemiBold'],
        'sans-bold': ['Inter_700Bold'],
        display: ['SpaceGrotesk_500Medium'],
        'display-semibold': ['SpaceGrotesk_600SemiBold'],
        'display-bold': ['SpaceGrotesk_700Bold'],
        mono: ['SpaceMono_400Regular'],
        'mono-bold': ['SpaceMono_700Bold'],
      },
      fontSize: {
        'display-lg': ['40px', { lineHeight: '44px', letterSpacing: '-1px' }],
        display: ['34px', { lineHeight: '38px', letterSpacing: '-0.8px' }],
        'display-sm': ['28px', { lineHeight: '32px', letterSpacing: '-0.5px' }],
        h1: ['24px', { lineHeight: '30px', letterSpacing: '-0.4px' }],
        h2: ['20px', { lineHeight: '26px', letterSpacing: '-0.2px' }],
        title: ['17px', { lineHeight: '22px' }],
        body: ['15px', { lineHeight: '21px' }],
        caption: ['13px', { lineHeight: '18px' }],
        micro: ['11px', { lineHeight: '14px', letterSpacing: '0.3px' }],
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
    },
  },
  plugins: [],
};
