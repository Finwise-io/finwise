/** OUTSIDE CHECK 2, 2026-11-12 — THE APP'S ROOT TOUCHES THE RECORD ONLY AFTER THIS PERSON'S PROFILE HAS LOADED.
 *
 *  A signed out with nothing reset; B signed in; B's profile load failed; the next store change loaded B's record and moved
 *  A's accounts (Savings $12,400, Brokerage $30,000 with 100 VTI) into it, owned by B and allowed to upload. And a part of the
 *  cloud's record the phone could not read was taken as the end of the record, so a save rewrote it from part 0.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';

jest.mock('../services/firebase', () => ({
  onAuthChange: jest.fn((cb: any) => { (global as any).mockAuthCb = cb; return () => {}; }),
  loadUserRoot: jest.fn(),
  loadUserData: jest.fn(() => Promise.resolve(null)),
  saveUserData: jest.fn(() => Promise.resolve()),
  loadAssetRecordPart: jest.fn(),
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

import { useStore } from '../store/useStore';
import RootLayout from '../../app/_layout';
import { UNREADABLE } from '../services/sync/assetRecordCloud';

const mockFb = jest.requireMock('../services/firebase') as any;
const signIn = (u: any) => (global as any).mockAuthCb(u);
const st = () => useStore.getState() as any;
const flush = async (ms = 2100) => { await act(async () => { jest.advanceTimersByTime(ms); }); for (let i = 0; i < 10; i++) await act(async () => { await Promise.resolve(); }); };

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  st().resetAll();
  useStore.setState({ user: null, householdId: null, assetRecordOwner: null, phoneDataOwner: null, assetRecord: [], assetRecordQuestions: {}, assetRecordFaults: [] } as any);
});
afterEach(() => jest.useRealTimers());

test('B signs in after A on the same phone and B\'s profile load fails: A\'s Savings $12,400 and Brokerage $30,000 with 100 VTI are never moved into B\'s record, and nothing of the record is loaded or saved', async () => {
  st().addAsset({ label: 'A Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 12_400, source: 'manual', value_as_of: '2026-11-01' });
  st().addAsset({ label: 'A Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 30_000, source: 'manual', value_as_of: '2026-11-01' });
  st().addPosition(String(st().assetAccounts[1].asset_id), { ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 80, purchase_date: '2025-03-03' }] });
  useStore.setState({ assetRecord: [], assetRecordOwner: 'uidA' } as any);   // A's phone, record not yet moved
  mockFb.loadUserRoot.mockRejectedValue(new Error('offline'));
  mockFb.loadAssetRecordPart.mockResolvedValue(null);
  render(<RootLayout />);
  await act(async () => { await signIn({ uid: 'uidB', email: 'b@b.com', metadata: {} }); });
  act(() => { useStore.setState({ hideBalances: false } as any); });   // the next store change
  await flush();
  expect(mockFb.loadAssetRecordPart).not.toHaveBeenCalled();
  expect(mockFb.commitAssetRecord).not.toHaveBeenCalled();
  expect(mockFb.saveUserData).not.toHaveBeenCalled();                    // A's profile never goes to B's cloud either
  expect(st().assetRecord).toEqual([]);                             // nothing of A's moved
  // DEC-10813, outside check 5 (L8): the phone's owner was never noted, so A's data is set aside at B's sign-in, and B's
  // screens hold none of it while B's profile cannot load
  expect(st().assetRecordOwner).toBeNull();
  expect(st().assetAccounts).toEqual([]);
});

test('a part of the cloud\'s record this phone cannot read: nothing is saved, a fault says so, and the load is tried again on the next change', async () => {
  mockFb.loadUserRoot.mockResolvedValue({ householdId: null, appState: { onboardingComplete: true } });
  mockFb.loadAssetRecordPart.mockImplementation(async (_o: string, part: number) => (part < 2 ? UNREADABLE : null));
  render(<RootLayout />);
  await act(async () => { await signIn({ uid: 'uidC', email: 'c@c.com', metadata: {} }); });
  act(() => { st().addAsset({ label: 'New', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 100, source: 'manual', value_as_of: '2026-11-12' }); });
  expect(st().assetRecord.length).toBeGreaterThan(0);
  await flush();
  expect(mockFb.commitAssetRecord).not.toHaveBeenCalled();
  const faults = st().assetRecordFaults.filter((f: any) => /cannot be read/.test(f.message));
  expect(faults).toHaveLength(1);
  const calls = mockFb.loadAssetRecordPart.mock.calls.length;
  act(() => { useStore.setState({ hideBalances: true } as any); });
  await flush();
  expect(mockFb.loadAssetRecordPart.mock.calls.length).toBeGreaterThan(calls);   // tried again
  expect(mockFb.commitAssetRecord).not.toHaveBeenCalled();
  expect(st().assetRecordFaults.filter((f: any) => /cannot be read/.test(f.message))).toHaveLength(1);   // said once
});

test('B signs in after A on the same phone and B\'s profile loads: A\'s Savings $12,400 and Brokerage $30,000 with 100 VTI, still on the phone, are never moved into B\'s record', async () => {
  st().addAsset({ label: 'A Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 12_400, source: 'manual', value_as_of: '2026-11-01' });
  st().addAsset({ label: 'A Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 30_000, source: 'manual', value_as_of: '2026-11-01' });
  useStore.setState({ assetRecord: [], assetRecordOwner: 'uidA' } as any);   // A's phone, A signed out, data kept
  // B's cloud profile names no accounts, so A's stay in the phone's old copies (as before this phase)
  mockFb.loadUserRoot.mockResolvedValue({ householdId: null, appState: { onboardingComplete: true } });
  mockFb.loadAssetRecordPart.mockResolvedValue(null);
  render(<RootLayout />);
  await act(async () => { await signIn({ uid: 'uidB', email: 'b@b.com', metadata: {} }); });
  act(() => { useStore.setState({ hideBalances: false } as any); });
  await flush();
  expect(st().assetRecordOwner).toBe('uidB');
  expect(st().assetRecord.filter((r: any) => r.kind === 'VALUE')).toEqual([]);           // nothing of A's moved
  // DEC-10813 (2026-11-12): B's cloud accounts share no id with the phone's, so A's are set aside and B's phone holds none of them
  expect(st().assetAccounts).toEqual([]);
  expect(st().phoneDataOwner).toBe('uidB');
});

test('A signs in on A\'s own phone: A\'s Savings $12,400 typed as of Nov 1 is moved onto the record once, and the record is saved once', async () => {
  st().addAsset({ label: 'A Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 12_400, source: 'manual', value_as_of: '2026-11-01' });
  useStore.setState({ assetRecord: [], assetRecordOwner: 'uidA' } as any);
  const id = String(st().assetAccounts[0].asset_id);
  mockFb.loadUserRoot.mockResolvedValue({ householdId: null, appState: { onboardingComplete: true, assetAccounts: st().assetAccounts } });
  mockFb.loadAssetRecordPart.mockResolvedValue(null);
  const commits: number[] = [];
  mockFb.commitAssetRecord.mockImplementation(() => async (parts: any[]) => { commits.push(parts.length); return { status: 'saved' }; });
  render(<RootLayout />);
  await act(async () => { await signIn({ uid: 'uidA', email: 'a@b.com', metadata: {} }); });
  act(() => { useStore.setState({ hideBalances: false } as any); });
  await flush();
  await flush();
  const values = st().assetRecord.filter((r: any) => r.kind === 'VALUE' && r.accountId === id);
  expect(values.map((r: any) => [r.date, r.typedValue])).toEqual([['2026-11-01', 12_400]]);
  expect(commits).toEqual([1]);                                     // saved once
});

test('offline: a save that fails is tried again at the next change, never at once (it looped without end)', async () => {
  st().addAsset({ label: 'A Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 12_400, source: 'manual', value_as_of: '2026-11-01' });
  useStore.setState({ assetRecord: [], assetRecordOwner: 'uidA' } as any);
  mockFb.loadUserRoot.mockResolvedValue({ householdId: null, appState: { onboardingComplete: true, assetAccounts: st().assetAccounts } });
  mockFb.loadAssetRecordPart.mockResolvedValue(null);
  let tries = 0;
  mockFb.commitAssetRecord.mockImplementation(() => async () => { tries++; throw new Error('offline'); });
  render(<RootLayout />);
  await act(async () => { await signIn({ uid: 'uidA', email: 'a@b.com', metadata: {} }); });
  act(() => { useStore.setState({ hideBalances: false } as any); });
  await flush();
  expect(tries).toBe(1);
  act(() => { useStore.setState({ hideBalances: true } as any); });   // the next change
  await flush();
  expect(tries).toBe(2);
});

// ── OUTSIDE CHECK 3, 2026-11-12 (DEC-10749, his "go"): a profile the phone cannot read yet is never taken as a new account ──
const add = (label: string, bal: number) => st().addAsset({ label, institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: bal, source: 'manual', value_as_of: '2026-11-01' });
const keyReady = () => (global as any).mockKeyReady?.();
function phoneOfA() {
  st().addAsset({ label: 'A Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 12_400, source: 'manual', value_as_of: '2026-11-01' });
  st().addAsset({ label: 'A Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 30_000, source: 'manual', value_as_of: '2026-11-01' });
  useStore.setState({ assetRecordOwner: 'uidA', phoneDataOwner: 'uidA', onboardingComplete: true, transactions: [{ id: 't1' }] } as any);   // A's phone, owner noted
  return JSON.parse(JSON.stringify(st().assetAccounts));
}

test('O3-1 password reset, no key on the phone: A\'s 2 accounts ($12,400 and $30,000), onboarding done and 1 activity stay; nothing saves; the recovery code loads the profile', async () => {
  const cloudAccounts = phoneOfA();
  mockFb.loadUserRoot.mockResolvedValue({ householdId: null, appState: null, appStateUnreadable: true });
  mockFb.loadAssetRecordPart.mockImplementation(async (_o: string, p: number) => (p === 0 ? UNREADABLE : null));
  mockFb.commitAssetRecord.mockImplementation(() => async () => ({ status: 'saved' }));
  render(<RootLayout />);
  await act(async () => { await signIn({ uid: 'uidA', email: 'a@a.com', metadata: {} }); });
  expect(st().assetAccounts.map((a: any) => [a.label, a.balance]).sort()).toEqual([['A Brokerage', 30_000], ['A Savings', 12_400]]);
  expect(st().onboardingComplete).toBe(true);
  expect(st().transactions).toHaveLength(1);
  act(() => { useStore.setState({ hideBalances: true } as any); });   // a change before the recovery code
  await flush();
  expect(mockFb.saveUserData).not.toHaveBeenCalled();                  // never the phone's copy over the cloud's unread one
  expect(mockFb.loadAssetRecordPart).not.toHaveBeenCalled();
  expect(mockFb.commitAssetRecord).not.toHaveBeenCalled();
  // the recovery code unwraps the key: the profile loads then, as a normal sign-in would
  mockFb.loadUserRoot.mockResolvedValue({ householdId: null, appState: { onboardingComplete: true, assetAccounts: cloudAccounts, transactions: [{ id: 't1' }] } });
  mockFb.loadAssetRecordPart.mockResolvedValue(null);
  await act(async () => { await keyReady(); });
  await flush();
  expect(mockFb.loadUserRoot).toHaveBeenCalledTimes(3);                // sign-in, the change (still unreadable), the key
  expect(st().assetAccounts).toHaveLength(2);
  expect(st().onboardingComplete).toBe(true);
  act(() => { useStore.setState({ hideBalances: false } as any); });
  await flush();
  const last = mockFb.saveUserData.mock.calls.at(-1);
  expect(last[0]).toBe('uidA');
  expect(last[1].assetAccounts).toHaveLength(2);
  expect(last[1].onboardingComplete).toBe(true);
  expect(mockFb.commitAssetRecord).toHaveBeenCalled();                 // the record loads and saves once the profile is in
});

test('O3-1b after a sign-out the key is not unwrapped yet when the profile loads: the phone is never reset, and the next change loads the profile', async () => {
  phoneOfA();
  mockFb.loadUserRoot.mockResolvedValueOnce({ householdId: null, appState: null, appStateUnreadable: true })
    .mockResolvedValue({ householdId: null, appState: { onboardingComplete: true, assetAccounts: JSON.parse(JSON.stringify(st().assetAccounts)) } });
  mockFb.loadAssetRecordPart.mockResolvedValue(null);
  render(<RootLayout />);
  await act(async () => { await signIn({ uid: 'uidA', email: 'a@a.com', metadata: {} }); });
  expect(st().assetAccounts).toHaveLength(2);
  expect(st().transactions).toHaveLength(1);
  act(() => { useStore.setState({ hideBalances: true } as any); });   // the next change, key now on the phone
  await flush();
  expect(mockFb.loadUserRoot).toHaveBeenCalledTimes(2);
  expect(st().assetAccounts).toHaveLength(2);
  expect(st().onboardingComplete).toBe(true);
});

test('O3-2 offline at launch, back online: 3 changes load the profile again at the first change, and the record then loads and saves', async () => {
  st().addAsset({ label: 'A Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 12_400, source: 'manual', value_as_of: '2026-11-01' });
  useStore.setState({ assetRecord: [], assetRecordOwner: 'uidA', phoneDataOwner: 'uidA', onboardingComplete: true } as any);
  mockFb.loadUserRoot.mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue({ householdId: null, appState: { onboardingComplete: true, assetAccounts: JSON.parse(JSON.stringify(st().assetAccounts)) } });
  mockFb.loadAssetRecordPart.mockResolvedValue(null);
  let commits = 0;
  mockFb.commitAssetRecord.mockImplementation(() => async () => { commits++; return { status: 'saved' }; });
  render(<RootLayout />);
  await act(async () => { await signIn({ uid: 'uidA', email: 'a@a.com', metadata: {} }); });
  for (let i = 0; i < 3; i++) { act(() => { add('New ' + i, 100 + i); }); await flush(); }
  expect(mockFb.loadUserRoot).toHaveBeenCalledTimes(2);                // 1 failed + 1 retried, never more
  expect(st().assetAccounts.map((a: any) => a.label).sort()).toEqual(['A Savings', 'New 0', 'New 1', 'New 2']);   // nothing typed is lost
  expect(commits).toBeGreaterThanOrEqual(1);
  expect(mockFb.saveUserData.mock.calls.length).toBeGreaterThanOrEqual(3);
  expect(mockFb.saveUserData.mock.calls.at(-1)[1].assetAccounts).toHaveLength(4);
});

test('O3-2b still offline: a failed profile load waits for the next change, never a tight loop', async () => {
  st().addAsset({ label: 'A Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 12_400, source: 'manual', value_as_of: '2026-11-01' });
  useStore.setState({ assetRecordOwner: 'uidA' } as any);
  mockFb.loadUserRoot.mockRejectedValue(new Error('offline'));
  render(<RootLayout />);
  await act(async () => { await signIn({ uid: 'uidA', email: 'a@a.com', metadata: {} }); });
  act(() => { useStore.setState({ hideBalances: true } as any); });
  for (let i = 0; i < 5; i++) await flush(5000);
  expect(mockFb.loadUserRoot).toHaveBeenCalledTimes(2);                // the launch + the one change
  expect(mockFb.commitAssetRecord).not.toHaveBeenCalled();
});

test('O3-2c offline at launch, owner never noted, nothing in the cloud: the retry keeps the $5,000 account typed in this session', async () => {
  useStore.setState({ assetRecordOwner: undefined } as any);
  mockFb.loadUserRoot.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ householdId: null, appState: null, appStateUnreadable: false });
  mockFb.loadAssetRecordPart.mockResolvedValue(null);
  mockFb.commitAssetRecord.mockImplementation(() => async () => ({ status: 'saved' }));
  render(<RootLayout />);
  await act(async () => { await signIn({ uid: 'uidA', email: 'a@a.com', metadata: {} }); });
  act(() => { add('Typed while offline', 5_000); });
  await flush();
  await flush();
  expect(st().assetAccounts.map((a: any) => [a.label, a.balance])).toEqual([['Typed while offline', 5_000]]);
  expect(mockFb.saveUserData.mock.calls.at(-1)[1].assetAccounts).toHaveLength(1);
});
