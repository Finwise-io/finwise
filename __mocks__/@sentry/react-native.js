// Jest stub for @sentry/react-native — so tests never load the native SDK. crashReporter's loadSentry()
// require()s this; reporting still stays disabled in tests because no DSN is configured (expo-constants
// is mocked with an empty `extra`).
module.exports = {
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  nativeCrash: jest.fn(),
  wrap: (c) => c,
};
