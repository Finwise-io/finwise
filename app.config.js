module.exports = {
  name: 'MoneyKeel',
  slug: 'finwise',
  version: '1.1.0',   // the MoneyKeel FCC redesign — 5-tab nav, lens heroes, Plan decisions
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  // BUILD-43 FEEDBACK #1 (2026-07-19): the approved splash never appeared because the package that
  // turns this config into the native launch screen (expo-splash-screen) was NOT installed — iOS
  // fell back to a generated default, which renders BLACK on phones in dark mode. The classic
  // `splash` key below is kept for reference, but the config-plugin entry in `plugins` is what
  // actually builds the launch screen now — white in BOTH light and dark (the approved design).
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#FFFFFF',
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
      NSFaceIDUsageDescription: 'Use Face ID to unlock FinWise and keep your financial data private.',
      ITSAppUsesNonExemptEncryption: false,
    },
    // Apple Privacy Manifest (generates ios/.../PrivacyInfo.xcprivacy at prebuild). Required since 2024.
    // App-level declarations only — bundled SDKs (Firebase, Sentry, AsyncStorage) ship their own.
    // Keep NSPrivacyCollectedDataTypes in sync with the App Privacy "nutrition label" in App Store Connect.
    privacyManifests: {
      NSPrivacyTracking: false,                 // no cross-app tracking / IDFA
      NSPrivacyTrackingDomains: [],
      NSPrivacyAccessedAPITypes: [
        {
          // AsyncStorage persists via UserDefaults; CA92.1 = access data stored only by this app.
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
          NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
        },
      ],
      NSPrivacyCollectedDataTypes: [
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeEmailAddress',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeName',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          // Budgets, net worth, accounts, retirement inputs — the user's own financial data.
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeOtherFinancialInfo',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          // Sentry crash + performance data (only when SENTRY_DSN is configured).
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeCrashData',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePerformanceData',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
      ],
    },
  },
  // DESKTOP Phase 1 (founder 'start building', 2026-08-03): the web target boots the same app in a
  // browser — scaffolding only; desktop layouts arrive with the mock-gated phases.
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/icon.png',
  },

  android: {
    package: 'co.finwise.app',   // match the iOS bundle (co.finwise.app is locked to App Store Connect)
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FFFFFF',
    },
    permissions: ['CAMERA', 'READ_EXTERNAL_STORAGE'],
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-camera',
    'expo-system-ui',
    'expo-sharing',
    // The launch screen (approved MoneyKeel splash) — full-screen image, white background in BOTH
    // light and dark so a dark-mode phone never shows a black splash (build-43 feedback #1).
    [
      'expo-splash-screen',
      {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#FFFFFF',
        enableFullScreenImage_legacy: true,
        dark: { image: './assets/splash.png', backgroundColor: '#FFFFFF' },
      },
    ],
    // Sentry: native integration + build-time source-map upload (reads SENTRY_AUTH_TOKEN from the EAS
    // secret). crashReporter.ts initializes the SDK at runtime using SENTRY_DSN from `extra` below.
    ['@sentry/react-native', { organization: 'finwise-35', project: 'react-native' }],
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
    // F-6: Sentry DSN is a PUBLIC ingest key (not a secret) — safe to bundle as the default.
    SENTRY_DSN:                   process.env.SENTRY_DSN                   || 'https://b25f5219e1c54f8fb5a20e3792f5636b@o4511617236926464.ingest.us.sentry.io/4511617274740736',
    // SnapTrade relay (deployed 2026-07-19): a non-secret URL — every call requires the caller's
    // Firebase ID token; the SnapTrade keys live ONLY in Secret Manager on the server.
    SNAPTRADE_RELAY_URL:          process.env.SNAPTRADE_RELAY_URL          || 'https://us-central1-finwise-app-jj.cloudfunctions.net/snaptradeRelay',
  },
};
