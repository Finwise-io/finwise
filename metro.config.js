// Sentry wraps the Expo Metro config so production bundles ship source maps (readable crash traces).
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

// Firebase JS SDK ships a React Native build via the package.json "react-native"
// field (dist/rn/index.js), but Metro's package-exports resolution (ON by default
// in Expo SDK 56) ignores that field and loads the browser build instead. That
// causes "Component auth has not been registered yet" at startup and leaves
// getReactNativePersistence undefined. Disabling package exports restores the
// legacy field resolution so the correct RN entry is used.
config.resolver.unstable_enablePackageExports = false;
config.resolver.sourceExts.push('cjs');

// DESKTOP Phase 1: on web, 'react-native' resolves to our shim (react-native-web + Alert, which
// RNW omits — 104 call sites depend on it). Native platforms are untouched. And Firebase must use
// its BROWSER build on web (the RN-field workaround above is a native-only need).
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native') {
    return { type: 'sourceFile', filePath: require.resolve('./desktop/platform/rnw-plus.js') };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
