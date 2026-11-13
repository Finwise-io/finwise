/** DEC-10813 (his "fix it", 2026-11-12) — ANOTHER PERSON SIGNS IN ON THIS PHONE: THE LAST PERSON'S DATA IS SET ASIDE.
 *
 *  Shipped in Build 57: A signed out, the phone kept A's data, B (A's spouse) signed in to B's own account. Every synced item
 *  B's cloud profile lacked stayed A's and was saved into B's account 2 s later; a brand-new B kept A's budget and hourly
 *  rate; A's activity and daily values stayed on the phone for B to see.
 *
 *  A's phone in every test: Savings $12,400, Brokerage $30,000 with 100 VTI, a daily value of $42,400 on 2026-11-01, an hourly
 *  rate of 99, an estate plan, 3 activity rows, and the master record those accounts made.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../services/firebase', () => ({
  onAuthChange: jest.fn((cb: any) => { (global as any).mockAuthCb = cb; return () => {}; }),
  loadUserRoot: jest.fn(),
  loadUserData: jest.fn(() => Promise.resolve(null)),
  saveUserData: jest.fn(() => Promise.resolve()),
  loadAssetRecordPart: jest.fn(() => Promise.resolve(null)),
  loadAssetRecordMarker: jest.fn(() => Promise.resolve(null)),
  commitAssetRecord: jest.fn(),
  getPhoneId: jest.fn(() => Promise.resolve('phone-1')),
  onSignOutFlush: jest.fn(),
  onDataKeyReady: jest.fn((fn: any) => { (global as any).mockKeyReady = fn; }),
  readUserProfile: jest.fn(() => Promise.resolve({ appState: null, appStateUnreadable: false })),
}));
jest.mock('expo-router', () => {
  const Stack: any = () => null;
  Stack.Screen = () => null;
  return { __esModule: true, Stack, useRouter: () => ({ replace: jest.fn() }), useSegments: () => ['(tabs)'] };
});
jest.mock('../services/crashReporter', () => ({ initCrashReporting: jest.fn(), setUserScope: jest.fn() }));
jest.mock('../services/sync/snaptradeClient', () => ({ snaptradeConfigured: () => false }));
jest.mock('../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(() => Promise.resolve()) }));
jest.mock('../components/RecoveryCodeModal', () => ({ RecoveryCodeModal: () => null }));
jest.mock('react-native-gesture-handler', () => ({ GestureHandlerRootView: ({ children }: any) => children }));
jest.mock('../components/ErrorBoundary', () => ({ ErrorBoundary: ({ children }: any) => children }));
jest.mock('../components/AppLockGate', () => ({ AppLockGate: ({ children }: any) => children }));

import { useStore, perPersonKeys, DEVICE_FIELDS } from '../store/useStore';
import RootLayout from '../../app/_layout';

const mockFb = jest.requireMock('../services/firebase') as any;
const signIn = (u: any) => (global as any).mockAuthCb(u);
const signOut = () => (global as any).mockAuthCb(null);
const userA = { uid: 'uidA', email: 'a@a.com', metadata: {} };
const userB = { uid: 'uidB', email: 'b@b.com', metadata: {} };
const st = () => useStore.getState() as any;
const flush = async (ms = 2100) => { await act(async () => { jest.advanceTimersByTime(ms); }); for (let i = 0; i < 15; i++) await act(async () => { await Promise.resolve(); }); };
const change = async () => { act(() => { useStore.setState({ hideBalances: !st().hideBalances } as any); }); await flush(); await flush(); };

let commits: Array<[string, any[]]> = [];
let clouds: Record<string, any> = {};
const setAsides = async () => ((await AsyncStorage.getAllKeys()) ?? []).filter((k: string) => k.startsWith('finwise-set-aside:'));

beforeEach(async () => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  await AsyncStorage.clear();
  st().resetAll();
  useStore.setState({ user: null, householdId: null, assetRecordOwner: null, phoneDataOwner: null, assetRecord: [], assetRecordQuestions: {}, assetRecordFaults: [], hideBalances: false } as any);
  commits = []; clouds = {};
  mockFb.commitAssetRecord.mockImplementation((owner: string) => async (parts: any[]) => { commits.push([owner, parts.flatMap((p: any) => p.rows)]); return { status: 'saved' }; });
  mockFb.loadUserRoot.mockImplementation(async (uid: string) => {
    const c = clouds[uid];
    if (c instanceof Error) throw c;
    return { householdId: null, appState: c ?? null, appStateUnreadable: false };
  });
});
afterEach(() => jest.useRealTimers());

/** A's own phone as it is after A used it signed in: the owner noted, the record made from A's accounts. */
function fillPhoneOfA() {
  st().addAsset({ label: 'A Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 12_400, source: 'manual', value_as_of: '2026-11-01' });
  st().addAsset({ label: 'A Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 30_000, source: 'manual', value_as_of: '2026-11-01' });
  st().addPosition(String(st().assetAccounts[1].asset_id), { ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 80, purchase_date: '2025-03-03' }] });
  useStore.setState({
    onboardingComplete: true, hourlyRate: 99, monthlyBudgetTarget: 7_777, emergencyMonths: 9, estatePlan: { will: 'A has a will' },
    nwDaily: { '2026-11-01': 42_400 },
    snapshotDays: [{ date: '2026-11-01', holdings: [], accounts: [{ accountId: 'A-total', value: 42_400 }], origin: 'observed', writtenAt: '2026-11-01T20:00:00Z' }],
    transactions: [{ id: 'tA1', amount: 41 }, { id: 'tA2', amount: 42 }, { id: 'tA3', amount: 43 }],
  } as any);
}
const aIds = () => st().assetAccounts.filter((a: any) => /^A /.test(a.label)).map((a: any) => String(a.asset_id));

/** A signs in (A's cloud already holds A's accounts), fills the phone, the profile is saved; A signs out. */
async function aUsesThePhoneThenSignsOut() {
  fillPhoneOfA();
  const ids = aIds();
  clouds.uidA = { onboardingComplete: true, assetAccounts: JSON.parse(JSON.stringify(st().assetAccounts)), hourlyRate: 99, nwDaily: { '2026-11-01': 42_400 }, estatePlan: { will: 'A has a will' } };
  useStore.setState({ assetRecordOwner: 'uidA' } as any);
  render(<RootLayout />);
  await act(async () => { await signIn(userA); });
  await change();
  expect(st().phoneDataOwner).toBe('uidA');
  await act(async () => { await signOut(); });   // the phone keeps A's data
  expect(st().transactions).toHaveLength(3);
  expect(st().assetAccounts).toHaveLength(2);
  mockFb.saveUserData.mockClear(); commits = [];
  return ids;
}

/** Nothing of A's in what was sent to B's cloud, nor on B's screens. */
function expectNothingOfA(ids: string[]) {
  for (const [to, payload] of mockFb.saveUserData.mock.calls) {
    expect(to).toBe('uidB');
    const text = JSON.stringify(payload);
    for (const s of ['A Savings', 'A Brokerage', 'VTI', '42400', 'A has a will', 'tA1', ...ids]) expect(text).not.toContain(s);
    expect(payload.hourlyRate).not.toBe(99);
    expect(payload.monthlyBudgetTarget).not.toBe(7_777);
    expect(payload.emergencyMonths).not.toBe(9);
  }
  for (const [owner, rows] of commits) { expect(owner).toBe('uidB'); for (const r of rows) expect(ids).not.toContain(String(r.accountId)); }
  const s = st();
  expect(s.assetAccounts.filter((a: any) => ids.includes(String(a.asset_id)))).toEqual([]);
  expect(s.transactions).toEqual([]);
  expect(s.snapshotDays).toEqual([]);
  expect(s.nwDaily ?? {}).toEqual({});
  expect(s.estatePlan ?? {}).toEqual({});
  expect(s.hourlyRate).toBe(25);
  expect(s.monthlyBudgetTarget).toBe(3_500);
  expect(s.emergencyMonths).toBe(6);
  expect(s.assetRecord.filter((r: any) => ids.includes(String(r.accountId)))).toEqual([]);
}

/** A signs in again: A's accounts from A's cloud, A's 3 activity rows, the daily value and the record are back; A's set-aside is gone. */
async function aSignsInAgain(ids: string[]) {
  await act(async () => { await signOut(); });
  await act(async () => { await signIn(userA); });
  await flush(); await flush();
  const s = st();
  expect(s.assetAccounts.map((a: any) => [a.label, a.balance]).sort()).toEqual([['A Brokerage', 30_000], ['A Savings', 12_400]]);
  expect(s.transactions.map((t: any) => t.id)).toEqual(['tA1', 'tA2', 'tA3']);
  expect(s.snapshotDays.map((d: any) => [d.date, d.accounts[0].value])).toEqual([['2026-11-01', 42_400]]);
  expect(s.nwDaily).toEqual({ '2026-11-01': 42_400 });
  expect(s.hourlyRate).toBe(99);
  expect(s.assetRecord.filter((r: any) => r.kind === 'VALUE' && ids.includes(String(r.accountId))).map((r: any) => r.typedValue).sort()).toEqual([12_400, 30_000]);
  expect(s.phoneDataOwner).toBe('uidA');
  const left = await setAsides();
  expect(left.filter((k: string) => k.includes('uidA'))).toEqual([]);   // A's set-aside is gone
}

test('(a) B has a cloud profile with no daily values, no estate plan and no accounts: nothing of A\'s reaches B\'s cloud or B\'s screens; A gets it all back', async () => {
  const ids = await aUsesThePhoneThenSignsOut();
  clouds.uidB = { onboardingComplete: true, incomes: [] };
  await act(async () => { await signIn(userB); });
  expect(await setAsides()).toHaveLength(1);                      // A's, set aside before B's profile loaded
  await change();
  expect(mockFb.saveUserData).toHaveBeenCalled();
  expectNothingOfA(ids);
  expect(st().onboardingComplete).toBe(true);                     // B's own profile
  await aSignsInAgain(ids);
  expect((await setAsides()).filter((k: string) => k.includes('uidB'))).toHaveLength(1);   // B's data now set aside for B
});

test('(b) B is brand new: B starts with nothing of A\'s — no $7,777 budget, no 9 emergency months, no hourly rate of 99; A gets it all back', async () => {
  const ids = await aUsesThePhoneThenSignsOut();
  await act(async () => { await signIn(userB); });
  await change();
  expect(mockFb.saveUserData).toHaveBeenCalled();
  expectNothingOfA(ids);
  expect(st().onboardingComplete).toBe(false);
  await aSignsInAgain(ids);
});

test('(c) B signs in offline first, then online: B never sees A\'s data, nothing is saved offline, and nothing of A\'s is saved once online', async () => {
  const ids = await aUsesThePhoneThenSignsOut();
  clouds.uidB = new Error('offline');
  await act(async () => { await signIn(userB); });
  expectNothingOfA(ids);                                          // offline: A's data is already aside
  await change();
  expect(mockFb.saveUserData).not.toHaveBeenCalled();
  clouds.uidB = { onboardingComplete: true };
  await change();
  expect(mockFb.saveUserData).toHaveBeenCalled();
  expectNothingOfA(ids);
  await aSignsInAgain(ids);
});

test('the per-person fields cover the whole store: every field but the device settings is set aside and cleared', async () => {
  const keys = perPersonKeys();
  const init0 = (useStore as any).getInitialState();
  const dataKeys = Object.keys(init0).filter((k) => typeof init0[k] !== 'function');
  expect(dataKeys.length).toBeGreaterThanOrEqual(88);             // the guard looked at the whole store
  expect(keys.length + DEVICE_FIELDS.length).toBe(dataKeys.length);   // every field is one or the other
  expect(keys.length).toBeGreaterThanOrEqual(76);
  for (const k of ['transactions', 'snapshotDays', 'assetRecord', 'assetRecordOwner', 'assetRecordQuestions', 'assetRecordFaults', 'householdId', 'hourlyRate', 'monthlyBudgetTarget', 'emergencyMonths', 'nwDaily', 'estatePlan', 'assetAccounts']) expect(keys).toContain(k);
  for (const k of DEVICE_FIELDS) expect(keys).not.toContain(k);
  fillPhoneOfA();
  useStore.setState({ householdId: 'h1', assetRecordOwner: 'h1', fontScale: 1.3, appLockEnabled: true } as any);
  st().clearPerson();
  const init = (useStore as any).getInitialState();
  for (const k of keys) expect([k, JSON.stringify(st()[k] ?? null)]).toEqual([k, JSON.stringify(init[k] ?? null)]);
  expect(st().fontScale).toBe(1.3);                               // the phone's own settings stay
  expect(st().appLockEnabled).toBe(true);
});

test('an old phone with no owner noted and no saved user: B (no account id in common) gets nothing of A\'s; A (the same account ids) gets it back', async () => {
  fillPhoneOfA();
  const ids = aIds();
  useStore.setState({ assetRecordOwner: 'uidA', phoneDataOwner: null, user: null } as any);   // Build 57 after a sign-out
  clouds.uidA = { onboardingComplete: true, assetAccounts: JSON.parse(JSON.stringify(st().assetAccounts)), hourlyRate: 99, nwDaily: { '2026-11-01': 42_400 } };
  clouds.uidB = { onboardingComplete: true, assetAccounts: [{ asset_id: 'b1', label: 'B Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 500, source: 'manual', value_as_of: '2026-11-02' }] };
  render(<RootLayout />);
  await act(async () => { await signIn(userB); });
  await change();
  expect(mockFb.saveUserData).toHaveBeenCalled();
  expectNothingOfA(ids);
  expect(st().assetAccounts.map((a: any) => a.label)).toEqual(['B Checking']);
  const aside = await setAsides();
  expect(aside).toHaveLength(1);
  expect(aside[0]).toContain('~unnamed');
  await aSignsInAgain(ids);
  expect((await setAsides()).filter((k: string) => k.includes('~unnamed'))).toEqual([]);
});

test('the key arrives while the profile load is on its way and that load comes back unreadable: the profile is loaded again at once', async () => {
  fillPhoneOfA();
  useStore.setState({ assetRecordOwner: 'uidA', phoneDataOwner: 'uidA' } as any);
  const cloudAccounts = JSON.parse(JSON.stringify(st().assetAccounts));
  let release: any;
  mockFb.loadUserRoot.mockImplementationOnce(() => new Promise((res) => { release = res; }))
    .mockResolvedValue({ householdId: null, appState: { onboardingComplete: true, assetAccounts: cloudAccounts, hourlyRate: 55 }, appStateUnreadable: false });
  render(<RootLayout />);
  let p: any;
  await act(async () => { p = signIn(userA); });
  await act(async () => { await (global as any).mockKeyReady(); });   // the recovery code: no store change follows
  await act(async () => { release({ householdId: null, appState: null, appStateUnreadable: true }); await p; });
  for (let i = 0; i < 10; i++) await act(async () => { await Promise.resolve(); });
  expect(mockFb.loadUserRoot).toHaveBeenCalledTimes(2);
  expect(st().hourlyRate).toBe(55);                               // the cloud's profile is in
  expect(st().transactions).toHaveLength(3);                      // the same person: nothing set aside
  expect(await setAsides()).toEqual([]);
});

// ── OUTSIDE CHECK 5, 2026-11-12: four faults in the set-aside, each with real numbers ──
const bChecking = { asset_id: 'b1', label: 'B Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 500, source: 'manual', value_as_of: '2026-11-02' };

test('O5-1 an old phone, no owner noted, no saved user: B signs in OFFLINE and B\'s screens hold nothing of A\'s ($12,400, $30,000, 3 activity rows, the $42,400 day, the will, the $7,777 budget)', async () => {
  fillPhoneOfA();
  const ids = aIds();
  useStore.setState({ assetRecordOwner: 'uidA', phoneDataOwner: null, user: null } as any);
  clouds.uidB = new Error('offline');
  render(<RootLayout />);
  await act(async () => { await signIn(userB); });
  expectNothingOfA(ids);
  await change();
  expect(mockFb.saveUserData).not.toHaveBeenCalled();
  expect((await setAsides()).filter((k: string) => k.includes('~unnamed'))).toHaveLength(1);
});

test('O5-2 B, brand new in the cloud, types activity tB1, an hourly rate of 31 and B Checking $500 offline; A signs in; B signs in online and gets all three back', async () => {
  const ids = await aUsesThePhoneThenSignsOut();
  clouds.uidB = new Error('offline');
  await act(async () => { await signIn(userB); });
  act(() => { useStore.setState({ transactions: [{ id: 'tB1', amount: 7 }], hourlyRate: 31, onboardingComplete: true } as any); });
  act(() => { st().addAsset({ ...bChecking, asset_id: undefined }); });
  await flush(); await flush();
  expect(mockFb.saveUserData).not.toHaveBeenCalled();
  await aSignsInAgain(ids);
  delete clouds.uidB;                                             // online now, and nothing of B's in the cloud
  await act(async () => { await signOut(); });
  await act(async () => { await signIn(userB); });
  await flush(); await flush();
  expect(st().transactions.map((t: any) => t.id)).toEqual(['tB1']);
  expect(st().hourlyRate).toBe(31);
  expect(st().assetAccounts.map((a: any) => [a.label, a.balance])).toEqual([['B Checking', 500]]);
  expect((await setAsides()).filter((k: string) => k.includes('uidB'))).toEqual([]);
  expectNoAInSaves(ids);
});
function expectNoAInSaves(ids: string[]) {
  for (const [to, payload] of mockFb.saveUserData.mock.calls) {
    if (to !== 'uidB') continue;
    const text = JSON.stringify(payload);
    for (const s of ['A Savings', 'A Brokerage', '42400', 'A has a will', 'tA1', ...ids]) expect(text).not.toContain(s);
  }
}

test('O5-3 A\'s cloud copy lacks the estate plan, the $7,777 budget and the daily values: after B, A gets them back from the set-aside', async () => {
  fillPhoneOfA();
  useStore.setState({ assetRecordOwner: 'uidA', phoneDataOwner: null, user: null } as any);
  clouds.uidA = { onboardingComplete: true, assetAccounts: JSON.parse(JSON.stringify(st().assetAccounts)), hourlyRate: 99 };
  clouds.uidB = { onboardingComplete: true, assetAccounts: [bChecking] };
  render(<RootLayout />);
  await act(async () => { await signIn(userB); });
  await flush(); await flush();
  expect(st().estatePlan ?? {}).toEqual({});
  await act(async () => { await signOut(); });
  await act(async () => { await signIn(userA); });
  await flush(); await flush();
  expect(st().estatePlan).toEqual({ will: 'A has a will' });
  expect(st().monthlyBudgetTarget).toBe(7_777);
  expect(st().emergencyMonths).toBe(9);
  expect(st().nwDaily).toEqual({ '2026-11-01': 42_400 });
  expect(st().hourlyRate).toBe(99);                               // the cloud's, where it has one
  expect((await setAsides()).filter((k: string) => k.includes('~unnamed'))).toEqual([]);
});

test('O5-4 a set-aside of B\'s this phone cannot decrypt: kept, and said once in the faults, not at every sign-in', async () => {
  const bad = 'finwise-set-aside:uidB:2026-01-01T00:00:00.000Z:zzz';
  await AsyncStorage.setItem(bad, 'enc:U2FsdGVkX1+garbagegarbagegarbage==');
  clouds.uidB = { onboardingComplete: true };
  render(<RootLayout />);
  const said = () => st().assetRecordFaults.filter((f: any) => f.where === 'data set aside on this phone').length;
  await act(async () => { await signIn(userB); });
  await flush();
  expect(said()).toBe(1);
  expect(await AsyncStorage.getItem(bad)).not.toBeNull();         // never deleted
  useStore.setState({ assetRecordFaults: [] } as any);
  await act(async () => { await signOut(); });
  await act(async () => { await signIn(userA); });
  await act(async () => { await signOut(); });
  await act(async () => { await signIn(userB); });
  await flush();
  expect(said()).toBe(0);                                         // said once only
  expect(await AsyncStorage.getItem(bad)).not.toBeNull();
});
