const expoPreset = require('jest-expo/jest-preset');

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.@(ts|tsx)'],
  // Extend (not replace) the preset's setup files so RN mocks stay intact.
  setupFiles: [...(expoPreset.setupFiles ?? []), '<rootDir>/jest-setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|nativewind|react-native-css-interop|lucide-react-native|react-native-keyboard-controller|@gorhom)',
  ],
};
