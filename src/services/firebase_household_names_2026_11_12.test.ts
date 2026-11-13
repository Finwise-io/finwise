/** THE HOUSEHOLD'S NAMES AND CODES, in the cloud layer (2026-11-12, cloud copy R13, R14, R16; the gap found while drawing: nothing
 *  stored the household member's name, yet the owner's Settings, the return code door and the delete warning say it). The member
 *  document now keeps both first names, plain — the owner's phone must name the member before the data is unlocked — and the
 *  sign-up's check of the two codes says which refusal applies. Firestore is held in memory here. */
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
    deleteField: jest.fn(() => DEL), addDoc: jest.fn(), collection: jest.fn((_db: any, ...path: string[]) => path.join('/')),
    getDocs: jest.fn(async (col: string) => ({ docs: Object.keys(mockDocs).filter((k) => k.startsWith(col + '/') && !k.slice(col.length + 1).includes('/')).map((k) => ({ id: k.slice(col.length + 1), data: () => mockDocs[k] })) })), serverTimestamp: jest.fn(() => 'SERVER_TIME'),
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


import { encryptWithKey, keyIdOf } from './dataCrypto';
import { createInviteWithKeyCode, joinHouseholdWithKeyCode, loadHouseholdPeople, checkInviteCodes, withdrawInvite, firstNameOf, loadUserRoot } from './firebase';

const PAT_KEY = 'a'.repeat(64);
const SAM_KEY = 'b'.repeat(64);
const NOV12 = Date.UTC(2026, 10, 12, 17, 41);
const DAY = 86400000;

beforeEach(() => {
  for (const k of Object.keys(mockDocs)) delete mockDocs[k];
  mockWrites.length = 0;
  mockKey = PAT_KEY;
  (global as any).mockAuth = { currentUser: { uid: 'pat', email: 'p@p.com' } };
  jest.spyOn(Date, 'now').mockReturnValue(NOV12);
});
afterEach(() => jest.restoreAllMocks());

/** Pat's invite, made on Nov 12 at the server's time (a Timestamp-like value, as Firestore hands it back) */
async function patInvites() {
  mockDocs['users/pat'] = { appStateEnc: encryptWithKey({ assetAccounts: [{ asset_id: 'brk', label: 'Brokerage', balance: 30_000 }] }, PAT_KEY), keyId: keyIdOf(PAT_KEY) };
  const out = await createInviteWithKeyCode('pat', 'Pat');
  mockDocs[`invites/${out.code}`].createdAt = { toMillis: () => NOV12 };
  mockKey = SAM_KEY;
  (global as any).mockAuth = { currentUser: { uid: 'sam' } };
  return out;
}

test('first names: "Pat Rivera" → "Pat"; nothing typed → nothing', () => {
  expect(firstNameOf('Pat Rivera')).toBe('Pat');
  expect(firstNameOf('  Sam  ')).toBe('Sam');
  expect(firstNameOf('')).toBeNull();
  expect(firstNameOf(null)).toBeNull();
});

test('R13 the codes are checked before anything is joined: right → ok, naming Pat, ending Nov 19 (7 days)', async () => {
  const { code, keyCode } = await patInvites();
  const grouped = (keyCode.match(/.{4}/g) as string[]).join('-');
  const ok: any = await checkInviteCodes(code.toLowerCase(), grouped);   // typed in small letters and with dashes, it is the same code
  expect(ok).toMatchObject({ status: 'ok', householdId: 'pat', inviterName: 'Pat' });
  expect(ok.expiresAt - NOV12).toBe(7 * DAY);
  expect(mockDocs['households/pat/members/sam']).toBeUndefined();   // checking joins nothing
});

test('R13 the refusals: one letter wrong, no key code, past 7 days, no such invite', async () => {
  const { code, keyCode } = await patInvites();
  const wrong = keyCode.slice(0, 19) + (keyCode[19] === 'K' ? 'J' : 'K');
  expect((await checkInviteCodes(code, wrong)).status).toBe('wrong-key-code');
  expect((await checkInviteCodes(code, '')).status).toBe('no-key-code');
  (Date.now as jest.Mock).mockReturnValue(NOV12 + 8 * DAY);   // Nov 20
  expect(await checkInviteCodes(code, keyCode)).toMatchObject({ status: 'expired', inviterName: 'Pat', expiresAt: NOV12 + 7 * DAY });
  expect((await checkInviteCodes('ZZZZZZ', keyCode)).status).toBe('not-found');
});

test('R13 + the names: Sam joins with both codes; the member document keeps both first names; Sam reads Pat\'s Brokerage $30,000 and Settings\' words', async () => {
  const { code, keyCode } = await patInvites();
  expect(await joinHouseholdWithKeyCode('sam', code, keyCode, 'sam-pass', 'SAMR-ECOV-ERYC-ODE1-2345', 'Sam Rivera')).toBe('pat');
  expect(mockDocs['households/pat/members/sam']).toMatchObject({ name: 'Sam', ownerName: 'Pat' });
  expect((await loadUserRoot('pat')).appState?.assetAccounts[0].balance).toBe(30_000);
  mockDocs['households/pat/members/sam'].joinedAt = { toMillis: () => NOV12 + 2 * DAY };   // the server's time, Nov 14
  // Sam's Settings: "You share Pat's household · Since Nov 14, 2026"
  expect(await loadHouseholdPeople('sam', 'pat')).toEqual({ role: 'member', owner: 'pat', ownerName: 'Pat', joinedAt: NOV12 + 2 * DAY });
  // Pat's phone names Sam — with no key at all (Restore your data, before the data is unlocked)
  mockKey = null;
  (global as any).mockAuth = { currentUser: { uid: 'pat' } };
  expect(await loadHouseholdPeople('pat', null)).toEqual({ role: 'owner', memberUid: 'sam', memberName: 'Sam', joinedAt: NOV12 + 2 * DAY });
});

test('a solo account has nobody; creating the two codes again withdraws the first invite', async () => {
  expect(await loadHouseholdPeople('alex', null)).toEqual({ role: 'solo' });
  const { code } = await patInvites();
  await withdrawInvite(code);
  expect(mockDocs[`invites/${code}`]).toBeUndefined();
});
