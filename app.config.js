module.exports = {
  name: 'FinWise',
  slug: 'finwise',
  version: '1.0.7',
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
    // NOTE: re-add '@sentry/react-native' here once a Sentry account (org/project/auth token + DSN)
    // is configured — the plugin's build-time source-map upload needs it. crashReporter.ts stays
    // dormant until SENTRY_DSN is set, so removing the plugin doesn't affect the app today.
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
