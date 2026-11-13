/** THE CLOUD COPY OF THE MASTER RECORD, design v02 (2026-11-12), in the cloud layer: the profileRev transaction that merges
 *  (R8, R8a, R18), the fingerprint (R12), the key code (R13), the return code (R14), the questions document (R6a), the
 *  device-only row tag (R1) and delete account on the server (R16). Firestore is held in memory here. */
const mockDocs: Record<string, any> = {};
const mockWrites: string[] = [];
jest.mock('firebase/auth', () => ({
  __esModule: true,
  getAuth: jest.fn(() => ({ get currentUser() { return (global as any).mockAuth?.currentUser; } })),
  initializeAuth: jest.fn(() => { throw new Error('no RN'); }),
  signInWithEmailAndPassword: jest.fn(async () => ({ user: { uid: (global as any).mockAuth.currentUser.uid } })),
  createUserWithEmailAndPassword: jest.fn(), signOut: jest.fn(), sendPasswordResetEmail: jest.fn(), sendEmailVerification: jest.fn(),
  onAuthStateChanged: jest.fn(), updateProfile: jest.fn(), deleteUser: jest.fn(async () => {}), reauthenticateWithCredential: jest.fn(async () => {}),
  EmailAuthProvider: { credential: jest.fn() },
}));
jest.mock('firebase/firestore', () => {
  const DEL = { __delete: true };
  const apply = (p: string, data: any, merge: boolean) => {
    const out = merge ? { ...(mockDocs[p] ?? {}) } : {};
    for (const [k, v] of Object.entries(data)) { if (v === DEL) delete out[k]; else out[k] = v; }
    mockDocs[p] = out; mockWrites.push(p);
  };
  const snap = (p: string) => ({ exists: () => p in mockDocs, data: () => mockDocs[p] });
  return {
    __esModule: true,
    getFirestore: jest.fn(() => ({})),
    doc: jest.fn((_db: any, ...path: string[]) => path.join('/')),
    getDoc: jest.fn(async (p: string) => snap(p)),
    setDoc: jest.fn(async (p: string, data: any, o?: any) => apply(p, data, !!o?.merge)),
    deleteDoc: jest.fn(async (p: string) => { delete mockDocs[p]; }),
    deleteField: jest.fn(() => DEL), addDoc: jest.fn(), collection: jest.fn(), serverTimestamp: jest.fn(() => 'SERVER_TIME'),
    runTransaction: jest.fn(async (_db: any, fn: any) => fn({ get: async (p: string) => snap(p), set: (p: string, d: any, o?: any) => apply(p, d, !!o?.merge) })),
  };
});
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
  };
});

import { encryptWithKey, decryptWithKey, keyIdOf, makeEnvelope, generateDataKey, keyCodeProof, keyCodeCheck, getDeviceTag, renewDeviceTag, generateDeviceTag } from './dataCrypto';
import { saveUserData, loadUserRoot, loadAssetRecordPart, commitAssetRecord, createInviteWithKeyCode, joinHouseholdWithKeyCode,
  leaveReturnCode, restoreOwnerWithReturnCode, loginUser, syncAssetRecordQuestions, loadMinAppVersion, deleteAccount } from './firebase';
import { startSync, trackChanges } from './sync/profileMerge';
import { UNREADABLE } from './sync/assetRecordCloud';

const PAT_KEY = 'a'.repeat(64);
const OTHER_KEY = 'b'.repeat(64);
const acc = (id: string, label: string, balance: number) => ({ asset_id: id, label, balance });
const openProfile = (uid: string, key = PAT_KEY) => decryptWithKey(mockDocs[`users/${uid}`].appStateEnc, key);

beforeEach(() => {
  for (const k of Object.keys(mockDocs)) delete mockDocs[k];
  mockWrites.length = 0;
  mockKey = PAT_KEY;
  (global as any).mockAuth = { currentUser: { uid: 'pat', email: 'p@p.com', getIdToken: async () => 'tok' } };
});

test('R8 + R8a the save is a profileRev transaction that merges: cloud $34,000 + HSA $3,000 (09:30, the spouse) + A\'s Roth $8,000 (09:00) = $45,000, profileRev 7 → 8', async () => {
  const agreed = { assetAccounts: [acc('chk', 'Checking', 4_000), acc('brk', 'Brokerage', 30_000)] };
  mockDocs['users/pat'] = { profileRev: 7, keyId: keyIdOf(PAT_KEY),
    appStateEnc: encryptWithKey({ assetAccounts: [...agreed.assetAccounts, acc('hsa', 'HSA', 3_000)], stamps: { 'assetAccounts#hsa': '2026-11-12T09:30:00Z' } }, PAT_KEY) };
  const sync = trackChanges(startSync('pat', agreed), { assetAccounts: [...agreed.assetAccounts, acc('roth', 'Roth IRA', 8_000)] }, '2026-11-12T09:00:00Z');
  const out: any = await saveUserData('pat', { assetAccounts: [...agreed.assetAccounts, acc('roth', 'Roth IRA', 8_000)] }, sync);
  expect(out.status).toBe('saved');
  expect(out.profile.assetAccounts.reduce((s: number, a: any) => s + a.balance, 0)).toBe(45_000);
  expect(mockDocs['users/pat'].profileRev).toBe(8);
  const stored = openProfile('pat');
  expect(stored.assetAccounts.map((a: any) => a.label)).toEqual(['Checking', 'Brokerage', 'HSA', 'Roth IRA']);
  expect(stored.stamps['assetAccounts#roth']).toBe('2026-11-12T09:00:00Z');
});

test('R18 + R12 no fingerprint, the key opens it (Build 57\'s profile, no stamps, no profileRev): A\'s Roth $8,000 at 09:00 is kept, profileRev 0 → 1, the fingerprint is added', async () => {
  mockDocs['users/pat'] = { appStateEnc: encryptWithKey({ assetAccounts: [acc('chk', 'Checking', 4_000)] }, PAT_KEY) };
  const sync = trackChanges(startSync('pat', { assetAccounts: [acc('chk', 'Checking', 4_000)] }), { assetAccounts: [acc('chk', 'Checking', 4_000), acc('roth', 'Roth IRA', 8_000)] }, '2026-11-12T09:00:00Z');
  const out: any = await saveUserData('pat', {}, sync);
  expect(out.status).toBe('saved');
  expect(mockDocs['users/pat'].profileRev).toBe(1);
  expect(mockDocs['users/pat'].keyId).toBe(keyIdOf(PAT_KEY));
  expect(openProfile('pat').assetAccounts.map((a: any) => a.balance)).toEqual([4_000, 8_000]);
});

test('R12 unknown fingerprint: the profile says 9c41e0aa51d7, Sam\'s phone has no key with it — nothing saved, the profile and its parts read as unreadable', async () => {
  mockDocs['users/pat'] = { profileRev: 3, keyId: '9c41e0aa51d7', appStateEnc: encryptWithKey({ assetAccounts: [] }, OTHER_KEY) };
  mockDocs['users/pat/assetRecord/0'] = { keyId: '9c41e0aa51d7', enc: encryptWithKey({ rows: [] }, OTHER_KEY) };
  mockKey = PAT_KEY;   // not the key that locked them
  expect(keyIdOf(PAT_KEY)).not.toBe('9c41e0aa51d7');
  const before = JSON.stringify(mockDocs['users/pat']);
  expect((await saveUserData('pat', { monthlyBudgetTarget: 1 }, startSync('pat', {}))).status).toBe('unreadable');
  expect(JSON.stringify(mockDocs['users/pat'])).toBe(before);
  expect((await loadUserRoot('pat')).appStateUnreadable).toBe(true);
  expect(await loadAssetRecordPart('pat', 0)).toBe(UNREADABLE);
});

test('R12 the fingerprint is a salted one-way hash: 12 hex letters, the same key gives the same, it never contains the key', () => {
  const id = keyIdOf(PAT_KEY);
  expect(id).toMatch(/^[0-9a-f]{12}$/);
  expect(keyIdOf(PAT_KEY)).toBe(id);
  expect(keyIdOf(OTHER_KEY)).not.toBe(id);
  expect(PAT_KEY).not.toContain(id);
});

test('R12 the record\'s parts are saved with the fingerprint', async () => {
  const r = await commitAssetRecord('pat')([{ part: 0, rows: [] }], null, { writer: 'p', rows: 0, lastRowId: null, lastWrittenAt: null });
  expect(r.status).toBe('saved');
  expect(mockDocs['users/pat/assetRecord/0'].keyId).toBe(keyIdOf(PAT_KEY));
});

test('R13 Pat invites Sam with K7MQ2D and a key code: Sam joins with both, re-locks the key under his own password, the invite is deleted, and Sam reads Pat\'s Brokerage $30,000', async () => {
  mockDocs['users/pat'] = { appStateEnc: encryptWithKey({ assetAccounts: [acc('brk', 'Brokerage', 30_000)] }, PAT_KEY), keyId: keyIdOf(PAT_KEY) };
  const { code, keyCode } = await createInviteWithKeyCode('pat', 'Pat');
  expect(keyCode).toMatch(/^[A-Z2-9]{20}$/);
  const inv = mockDocs[`invites/${code}`];
  expect(inv.keyCodeCheck).toBe(keyCodeCheck(keyCode));
  expect(JSON.stringify(inv)).not.toContain(PAT_KEY);
  // Sam's phone: Sam's own key
  mockKey = OTHER_KEY;
  (global as any).mockAuth = { currentUser: { uid: 'sam' } };
  await expect(joinHouseholdWithKeyCode('sam', code, 'WRONGWRONGWRONGWRONG', 'sam-pass', 'SAMR-ECOV')).rejects.toThrow(/key code/);
  expect(mockDocs['households/pat/members/sam']).toBeUndefined();
  expect(await joinHouseholdWithKeyCode('sam', code, keyCode, 'sam-pass', 'SAMR-ECOV')).toBe('pat');
  expect(mockDocs['households/pat/members/sam'].keyCodeProof).toBe(keyCodeProof(keyCode));
  expect(mockDocs[`invites/${code}`]).toBeUndefined();
  expect(mockKey).toBe(PAT_KEY);
  const root = await loadUserRoot('pat');
  expect(root.appState?.assetAccounts[0].balance).toBe(30_000);
  // a later sign-in on a new phone unlocks the household key with Sam's own password
  mockKey = null;
  mockDocs['users/sam'] = { ...mockDocs['users/sam'], keyEnvelope: makeEnvelope(OTHER_KEY, 'sam', 'sam-pass', 'SAMR-ECOV') };
  await loginUser('s@s.com', 'sam-pass');
  expect(mockKey).toBe(PAT_KEY);
});

test('R14 Pat loses both codes; Sam sends a return code; Pat types it, sets a new password and recovery code, and reads the same $30,000', async () => {
  mockDocs['users/pat'] = { appStateEnc: encryptWithKey({ assetAccounts: [acc('brk', 'Brokerage', 30_000)] }, PAT_KEY), keyId: keyIdOf(PAT_KEY) };
  mockKey = PAT_KEY;   // Sam's phone holds the household key
  const returnCode = await leaveReturnCode('pat');
  expect(JSON.stringify(mockDocs['households/pat/keyReturn/current'])).not.toContain(PAT_KEY);
  mockKey = null;      // Pat's phone: no key
  await expect(restoreOwnerWithReturnCode('NOPE-NOPE', 'new-pass')).rejects.toThrow(/incorrect/);
  const newRecovery = await restoreOwnerWithReturnCode(returnCode, 'new-pass');
  expect(newRecovery).toMatch(/^[A-Z2-9-]+$/);
  expect(mockKey).toBe(PAT_KEY);
  expect((await loadUserRoot('pat')).appState?.assetAccounts[0].balance).toBe(30_000);
  expect(mockDocs['households/pat/keyReturn/current']).toBeUndefined();
});

test('R6a the questions document: the $350/$320 question asked on A shows on B; answering on B removes it from both', async () => {
  const q = { 'acct-1#typed': { at: '2026-11-12T09:00:00Z', events: [{ text: 'Robinhood says $350, you entered $320' }], lists: [] } };
  expect((await syncAssetRecordQuestions('pat', q, []))!.questions).toEqual(q);                // A
  expect(mockDocs['users/pat/assetRecord/questions'].keyId).toBe(keyIdOf(PAT_KEY));
  const onB = await syncAssetRecordQuestions('pat', {}, []);                                    // B reads it
  expect(Object.keys(onB!.questions)).toEqual(['acct-1#typed']);
  expect((await syncAssetRecordQuestions('pat', {}, ['acct-1#typed']))!.questions).toEqual({}); // B answers it
  const backOnA = await syncAssetRecordQuestions('pat', q, ['acct-1#typed']);
  expect(backOnA).toEqual({ questions: {}, answeredElsewhere: ['acct-1#typed'] });
});

test('R8a the minimum app version is read from config/app', async () => {
  expect(await loadMinAppVersion()).toBeNull();
  mockDocs['config/app'] = { minVersion: '1.1.0.58' };
  expect(await loadMinAppVersion()).toBe('1.1.0.58');
});

test('R1 two phones, ids made a minute apart: tags differ; a backup restored on another phone has no tag in its keychain and makes a new one', async () => {
  const tags = new Set(Array.from({ length: 50 }, () => generateDeviceTag()));
  expect(tags.size).toBe(50);
  for (const t of tags) expect(t).toMatch(/^[a-z0-9]{12}$/);
  const mine = await getDeviceTag();
  expect(await getDeviceTag()).toBe(mine);                 // kept
  const SecureStore = require('expo-secure-store');
  await SecureStore.deleteItemAsync('moneykeel-row-tag');  // the keychain item is "this device only": a restored backup lacks it
  const restored = await renewDeviceTag();
  expect(restored).not.toBe(mine);
});

test('R16 delete account runs on the server: the phone calls the server function with its sign-in token, then removes the sign-in', async () => {
  process.env.DELETE_ACCOUNT_URL = 'https://example.test/deleteAccount';
  const calls: any[] = [];
  (global as any).fetch = jest.fn(async (url: string, init: any) => { calls.push([url, init.headers.Authorization]); return { ok: true }; });
  mockDocs['users/pat'] = { appStateEnc: 'enc:x' };
  await deleteAccount('pw');
  expect(calls).toEqual([['https://example.test/deleteAccount', 'Bearer tok']]);
  expect(mockDocs['users/pat']).toEqual({ appStateEnc: 'enc:x' });   // the server deletes it, not the phone
  delete process.env.DELETE_ACCOUNT_URL;
});
