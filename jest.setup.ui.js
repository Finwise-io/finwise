/* UI-project setup: mock every native/router/cloud seam so screens render hermetically.
 * Root __mocks__/ already covers AsyncStorage + expo-secure-store (auto-picked-up). */

// expo-router — screens navigate via useRouter(); tests assert against these spies.
jest.mock('expo-router', () => {
  const React = require('react');
  const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn() };
  return {
    __esModule: true,
    useRouter: () => router,
    useLocalSearchParams: () => ({}),
    useFocusEffect: (cb) => { /* no-op: focus callbacks don't fire in unit renders */ },
    usePathname: () => '/',
    router,
    Link: ({ children }) => children,
    Stack: { Screen: () => null },
    Redirect: () => null,
  };
});

// Safe-area — minimal inline mock (the package's official jest mock is a default export
// that doesn't interop cleanly here).
jest.mock('react-native-safe-area-context', () => ({
  __esModule: true,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 320, height: 640 }),
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  initialWindowMetrics: { frame: { x: 0, y: 0, width: 320, height: 640 }, insets: { top: 0, bottom: 0, left: 0, right: 0 } },
}));

// Firebase SDK ships ESM under jest-expo's resolution — mock the packages outright.
jest.mock('firebase/firestore', () => ({
  __esModule: true,
  getFirestore: jest.fn(() => null),
  doc: jest.fn(),
  setDoc: jest.fn(() => Promise.resolve()),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false, data: () => null })),
  serverTimestamp: jest.fn(() => 0),
}));
jest.mock('firebase/app', () => ({
  __esModule: true,
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({})),
}));
jest.mock('firebase/auth', () => ({ __esModule: true }));

// Cloud + native services — never touched in unit renders.
jest.mock('./src/services/firebase', () => ({
  __esModule: true,
  db: null,
  registerUser: jest.fn(), loginUser: jest.fn(), logoutUser: jest.fn(), resetPassword: jest.fn(),
  resendVerification: jest.fn(), refreshEmailVerified: jest.fn(() => Promise.resolve(false)),
  isEmailVerified: () => false,
  currentUserEmail: () => null,
  deleteAccount: jest.fn(() => Promise.resolve()),
  regenerateRecoveryCode: jest.fn(() => Promise.resolve('TEST-CODE')),
  restoreWithRecoveryCode: jest.fn(() => Promise.resolve()),
  onAuthChange: jest.fn(() => () => {}),
  saveUserData: jest.fn(() => Promise.resolve()), loadUserData: jest.fn(() => Promise.resolve(null)),
  createInvite: jest.fn(), lookupInvite: jest.fn(() => Promise.resolve(null)),
  setUserHousehold: jest.fn(), joinHouseholdMembership: jest.fn(() => Promise.resolve()),
  loadUserRoot: jest.fn(() => Promise.resolve({ householdId: null, appState: null })),
  submitFeedback: jest.fn(() => Promise.resolve()),
}));
jest.mock('./src/services/notifications', () => ({
  __esModule: true,
  requestNotificationPermission: jest.fn(() => Promise.resolve(false)),
  scheduleStreakReminder: jest.fn(), cancelStreakReminder: jest.fn(),
  sendBudgetAlert: jest.fn(), scheduleWeeklySummary: jest.fn(),
  addNotificationResponseListener: jest.fn(() => ({ remove: () => {} })),
}));
jest.mock('./src/services/receiptScan', () => ({
  __esModule: true,
  ocrAvailable: () => false,
  pickReceipt: jest.fn(() => Promise.resolve(null)),
  parseReceipt: jest.fn(() => ({})),
  ocrReceipt: jest.fn(() => Promise.resolve({ raw: '' })),
}));
jest.mock('expo-image-picker', () => ({
  __esModule: true,
  launchCameraAsync: jest.fn(() => Promise.resolve({ canceled: true })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true })),
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ granted: false })),
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ granted: false })),
  MediaTypeOptions: { Images: 'Images' },
}));
jest.mock('expo-document-picker', () => ({
  __esModule: true,
  getDocumentAsync: jest.fn(() => Promise.resolve({ canceled: true })),
}));
jest.mock('expo-file-system', () => ({
  __esModule: true,
  readAsStringAsync: jest.fn(() => Promise.resolve('')),
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  documentDirectory: '/tmp/',
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
}));
jest.mock('expo-haptics', () => ({
  __esModule: true,
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
