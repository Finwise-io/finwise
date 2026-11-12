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
  useStore.setState({ user: null, householdId: null, assetRecordOwner: null, assetRecord: [], assetRecordQuestions: {}, assetRecordFaults: [] } as any);
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
  expect(st().assetRecordOwner).toBe('uidA');
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
  expect(st().assetRecordFaults.map((f: any) => f.message)).toContain('This phone held another person\u2019s accounts, so they were not moved onto this person\u2019s record.');
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
