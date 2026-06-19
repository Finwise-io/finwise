module.exports = {
  name: 'FinWise',
  slug: 'finwise',
  version: '1.0.1',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#1a1f3a',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'co.finwise.app',
    // Reanimated 4.x ONLY supports the New Architecture (see its peerDeps/README).
    // Disabling it (commit c7e0223) crashed build #14 at launch. The real #11 crash
    // was Firebase (fixed in 7d70844), not a new-arch conflict.
    newArchEnabled: true,
    infoPlist: {
      NSCameraUsageDescription: 'Scan receipts to log expenses instantly.',
      NSPhotoLibraryUsageDescription: 'Upload receipt photos from your library.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'co.finwise.app',   // match the iOS bundle (co.finwise.app is locked to App Store Connect)
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1a1f3a',
    },
    permissions: ['CAMERA', 'READ_EXTERNAL_STORAGE'],
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-camera',
    'expo-system-ui',
    'expo-sharing',
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#1a1f3a',
      },
    ],
  ],
  scheme: 'finwise',
  extra: {
    eas: { projectId: '73cc38c4-bb3d-4cbc-89d0-ed9d4fc49eef' },
    FIREBASE_API_KEY:             process.env.FIREBASE_API_KEY             || '',
    FIREBASE_AUTH_DOMAIN:         process.env.FIREBASE_AUTH_DOMAIN         || '',
    FIREBASE_PROJECT_ID:          process.env.FIREBASE_PROJECT_ID          || '',
    FIREBASE_STORAGE_BUCKET:      process.env.FIREBASE_STORAGE_BUCKET      || '',
    FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    FIREBASE_APP_ID:              process.env.FIREBASE_APP_ID              || '',
    // F-1 (QA-2026-06-18): privileged provider keys (Anthropic / Google Vision) must NEVER be
    // bundled into the client — anything in `extra` ships in the app binary and is extractable.
    // The app now calls a server-side proxy that holds the key; only its (non-secret) URL is bundled.
    AI_PROXY_URL:                 process.env.AI_PROXY_URL                 || '',
    // F-6: Sentry DSN is a PUBLIC ingest key (not a secret) — safe to bundle.
    SENTRY_DSN:                   process.env.SENTRY_DSN                   || '',
  },
};
