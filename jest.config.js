// Two projects, split by extension:
//  - logic: the original node-env harness — every domain/store/service test is plain .test.ts
//  - ui:    jest-expo preset for rendering React Native components — UI tests are .test.tsx
// Keep the logic project byte-identical in behavior to the old single config.
const moduleNameMapper = { '^@/(.*)$': '<rootDir>/src/$1' };

module.exports = {
  projects: [
    {
      displayName: 'logic',
      testEnvironment: 'node',
      transform: {
        '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }],
      },
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|zustand)',
      ],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(test).ts'],
      moduleNameMapper,
    },
    {
      displayName: 'ui',
      preset: 'jest-expo',
      testMatch: ['**/__tests__/**/*.test.tsx', '**/?(*.)+(test).tsx'],
      setupFiles: ['<rootDir>/jest.setup.ui.js'],
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|zustand)',
      ],
      moduleNameMapper,
    },
  ],
};
