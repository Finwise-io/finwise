// Two projects, split by extension:
//  - logic: the original node-env harness — every domain/store/service test is plain .test.ts
//  - ui:    jest-expo preset for rendering React Native components — UI tests are .test.tsx
// Keep the logic project byte-identical in behavior to the old single config.
const moduleNameMapper = { '^@/(.*)$': '<rootDir>/src/$1' };

module.exports = {
  // A RENDERING TEST NEEDS LONGER THAN FIVE SECONDS UNDER LOAD (2026-09-30, corrected the same day).
  // Jest's default 5,000 ms applies to HOOKS as well as tests, and React Native Testing Library's
  // automatic afterEach cleanup unmounts every screen a file rendered. mock_match_dump renders 28 of
  // them; in a full parallel run that cleanup tipped over 5,000 ms and the file failed with "Exceeded
  // timeout of 5000 ms for a hook" while passing in isolation — the flake logged as B-90 since
  // 2026-07-12. A green suite is a build gate here, so a gate that reddens because the machine was
  // busy is a gate nobody can trust. A real hang still fails; it just fails honestly.
  //
  // IT MUST SIT HERE, AT THE TOP LEVEL. My first attempt put it inside the `ui` project, where Jest
  // does not accept it — it printed "Unknown option testTimeout" and IGNORED IT, so the fix never took
  // effect and I closed B-90 on it anyway. Jest warning me was the only reason I found out.
  testTimeout: 30_000,
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
