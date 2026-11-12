/** OUTSIDE CHECK 3, 2026-11-12 (DEC-10749, his "go"): a profile the phone cannot read yet is never taken as a new account.
 *  The cloud's profile tells "nothing in the cloud" apart from "there, but this phone has no key for it yet", and the key
 *  arriving (sign-in or the recovery code) tells the app's root to load the profile then.
 */
const mockDocs: Record<string, any> = {};
jest.mock('firebase/auth', () => ({
  __esModule: true,
  getAuth: jest.fn(() => ({ currentUser: { uid: 'uidA' } })),
  initializeAuth: jest.fn(() => { throw new Error('no RN'); }),
  signInWithEmailAndPassword: jest.fn(async () => ({ user: { uid: 'uidA' } })),
  createUserWithEmailAndPassword: jest.fn(), signOut: jest.fn(), sendPasswordResetEmail: jest.fn(), sendEmailVerification: jest.fn(),
  onAuthStateChanged: jest.fn(), updateProfile: jest.fn(), deleteUser: jest.fn(), reauthenticateWithCredential: jest.fn(),
  EmailAuthProvider: { credential: jest.fn() },
}));
jest.mock('firebase/firestore', () => ({
  __esModule: true,
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn((_db: any, ...path: string[]) => path.join('/')),
  getDoc: jest.fn(async (p: string) => ({ exists: () => p in mockDocs, data: () => mockDocs[p] })),
  setDoc: jest.fn(async () => {}), deleteDoc: jest.fn(), deleteField: jest.fn(), addDoc: jest.fn(), collection: jest.fn(),
  serverTimestamp: jest.fn(), runTransaction: jest.fn(),
}));
jest.mock('./firebaseConfig', () => ({ firebaseApp: {} }));
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn() } }));
let mockKey: string | null = null;
jest.mock('./dataCrypto', () => {
  const real = jest.requireActual('./dataCrypto');
  return {
    ...real,
    cacheDataKey: jest.fn(async (k: string) => { mockKey = k; }),
    clearDataKey: jest.fn(async () => { mockKey = null; }),
    getDataKey: jest.fn(async () => mockKey),
    encryptForSync: jest.fn(async (v: any) => (mockKey ? real.encryptWithKey(v, mockKey) : null)),
    decryptFromSync: jest.fn(async (v: any) => (v == null ? null : !real.isEncrypted(v) ? v : mockKey ? real.decryptWithKey(v, mockKey) : null)),
    unwrapWithPassword: jest.fn(() => 'k'.repeat(64)),
    unwrapWithRecovery: jest.fn(() => 'k'.repeat(64)),
    rewrapPassword: jest.fn(() => ({ p: 'x', r: 'y' })),
  };
});

import { encryptWithKey } from './dataCrypto';
import { loadUserRoot, readUserProfile, loginUser, restoreWithRecoveryCode, onDataKeyReady } from './firebase';

const KEY = 'k'.repeat(64);
const PROFILE = { onboardingComplete: true, assetAccounts: [{ label: 'A Savings', balance: 12_400 }, { label: 'A Brokerage', balance: 30_000 }] };

beforeEach(() => { for (const k of Object.keys(mockDocs)) delete mockDocs[k]; mockKey = null; onDataKeyReady(null); });

test('no profile in the cloud: not unreadable (a new account)', async () => {
  expect(await loadUserRoot('uidA')).toEqual({ householdId: null, appState: null, appStateUnreadable: false });
  expect(await readUserProfile('h1')).toEqual({ appState: null, appStateUnreadable: false });
});

test('A\'s profile (2 accounts, $12,400 and $30,000) with no key on the phone: unreadable, never "no profile"', async () => {
  mockDocs['users/uidA'] = { appStateEnc: encryptWithKey(PROFILE, KEY), keyEnvelope: { p: 'x', r: 'y' } };
  mockDocs['users/h1'] = { appStateEnc: encryptWithKey(PROFILE, KEY) };
  expect(await loadUserRoot('uidA')).toEqual({ householdId: null, appState: null, appStateUnreadable: true });
  expect(await readUserProfile('h1')).toEqual({ appState: null, appStateUnreadable: true });
  mockKey = KEY;
  expect(await loadUserRoot('uidA')).toEqual({ householdId: null, appState: PROFILE, appStateUnreadable: false });
  expect(await readUserProfile('h1')).toEqual({ appState: PROFILE, appStateUnreadable: false });
});

test('the key arriving tells the root: the recovery code, and a sign-in that unwraps the key with the password', async () => {
  mockDocs['users/uidA'] = { appStateEnc: encryptWithKey(PROFILE, KEY), keyEnvelope: { p: 'x', r: 'y' } };
  const ready = jest.fn(async () => {});
  onDataKeyReady(ready);
  await restoreWithRecoveryCode('AAAA-BBBB', 'newpass');
  expect(mockKey).toBe(KEY);
  expect(ready).toHaveBeenCalledTimes(1);
  mockKey = null;
  await loginUser('a@a.com', 'pass');
  expect(mockKey).toBe(KEY);
  expect(ready).toHaveBeenCalledTimes(2);
});
