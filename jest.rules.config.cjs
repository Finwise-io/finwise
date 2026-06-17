// Dedicated jest config for the Firestore rules tests — runs in a node env against the emulator,
// kept OUT of `npm test` (which runs the app's logic/ui projects with no emulator).
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/firestore.rules.test.cjs'],
};
