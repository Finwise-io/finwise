/** THE CLOUD COPY OF THE MASTER RECORD, design v02 (2026-11-12), at the app's root: offline typing is never replaced, data
 *  owners are never mixed (R11), unsaved changes are set aside with their owner's data (R15). Worked numbers from the design.
 *  The cloud here keeps the profile and its stamps and merges every save as the profileRev transaction does. */
import React from 'react';
import { render, act } from '@testing-library/react-native';

jest.mock('../services/firebase', () => {
  const { mergeProfile, withStamps } = jest.requireActual('../services/sync/profileMerge');
  const cloud: Record<string, { profile: any; stamps: any }> = {};
  const offline = { on: false };
  return {
    mockCloud: cloud, mockOffline: offline,
    onAuthChange: jest.fn((cb: any) => { (global as any).mockAuthCb = cb; return () => {}; }),
    loadUserRoot: jest.fn(async (uid: string) => {
      if (offline.on) throw new Error('offline');
      const c = cloud[uid];
      return { householdId: (global as any).mockHousehold?.[uid] ?? null, movedFrom: (global as any).mockMovedFrom?.[uid], appState: c ? withStamps(c.profile, c.stamps) : null, appStateUnreadable: false };
    }),
    readUserProfile: jest.fn(async (uid: string) => {
      if (offline.on) throw new Error('offline');
      const c = cloud[uid];
      return { appState: c ? withStamps(c.profile, c.stamps) : null, appStateUnreadable: false };
    }),
    saveUserData: jest.fn(async (owner: string, data: any, sync: any) => {
      if (offline.on) throw new Error('offline');
      const at = new Date().toISOString();
      const c = cloud[owner];
      const m = c ? mergeProfile(c.profile, c.stamps, sync, at) : { profile: data, stamps: {}, notes: [] };
      cloud[owner] = { profile: m.profile, stamps: m.stamps };
      return { status: 'saved', profile: m.profile, stamps: m.stamps, notes: m.notes, used: sync?.pending ?? {}, profileRev: 1 };
    }),
    loadUserData: jest.fn(() => Promise.resolve(null)),
    loadAssetRecordPart: jest.fn(async () => null),
    loadAssetRecordMarker: jest.fn(async () => null),
    commitAssetRecord: jest.fn(() => async () => ({ status: 'saved' })),
    getPhoneId: jest.fn(() => Promise.resolve('phone-1')),
    onSignOutFlush: jest.fn(),
    onDataKeyReady: jest.fn(),
  };
});
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
import { pickSyncFields, startSync } from '../services/sync/profileMerge';

const mockFb = jest.requireMock('../services/firebase') as any;
const st = () => useStore.getState() as any;
const signIn = (u: any) => (global as any).mockAuthCb(u);
const flush = async (ms = 2100) => { await act(async () => { jest.advanceTimersByTime(ms); }); for (let i = 0; i < 12; i++) await act(async () => { await Promise.resolve(); }); };
const add = (label: string, balance: number) => st().addAsset({ label, institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance, source: 'manual', value_as_of: '2026-11-01' });
const labels = (accs: any[]) => (accs ?? []).map((a: any) => [a.label, a.balance]).sort();

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  for (const k of Object.keys(mockFb.mockCloud)) delete mockFb.mockCloud[k];
  mockFb.mockOffline.on = false;
  (global as any).mockHousehold = {};
  (global as any).mockMovedFrom = {};
  st().resetAll();
  useStore.setState({ user: null, householdId: null, assetRecordOwner: null, phoneDataOwner: null, profileSync: null, assetRecord: [], assetRecordQuestions: {}, assetRecordFaults: [] } as any);
});
afterEach(() => jest.useRealTimers());

test('R11 offline first start: Pat\'s updated phone, offline, Savings $12,400 → $12,900; online, $12,900 is saved and never replaced by the cloud\'s $12,400', async () => {
  add('Savings', 12_400);
  useStore.setState({ phoneDataOwner: 'pat', assetRecordOwner: 'pat', onboardingComplete: true } as any);
  mockFb.mockCloud.pat = { profile: pickSyncFields(st()), stamps: {} };
  useStore.setState({ profileSync: startSync('pat', pickSyncFields(st())) } as any);   // the updated phone agreed with the cloud
  mockFb.mockOffline.on = true;
  render(<RootLayout />);
  await act(async () => { await signIn({ uid: 'pat', email: 'p@p.com', metadata: {} }); });
  act(() => { st().updateAsset(String(st().assetAccounts[0].asset_id), { balance: 12_900 }); });
  await flush();
  expect(labels(st().assetAccounts)).toEqual([['Savings', 12_900]]);
  mockFb.mockOffline.on = false;
  act(() => { useStore.setState({ hideBalances: true } as any); });   // the next change, back online
  await flush();
  await flush();
  expect(labels(st().assetAccounts)).toEqual([['Savings', 12_900]]);
  expect(labels(mockFb.mockCloud.pat.profile.assetAccounts)).toEqual([['Savings', 12_900]]);
});

test('R11 a pre-update phone (owner of the record never noted) is noted as the signed-in person\'s at once, so its offline typing is saved', async () => {
  add('Savings', 12_400);
  useStore.setState({ user: { uid: 'pat' }, phoneDataOwner: null, assetRecordOwner: undefined, onboardingComplete: true } as any);
  mockFb.mockOffline.on = true;
  render(<RootLayout />);
  await act(async () => { await signIn({ uid: 'pat', email: 'p@p.com', metadata: {} }); });
  expect(st().assetRecordOwner).toBe('pat');
});

test('R11 Sam joins Pat\'s household, then leaves: Sam\'s own $9,000 savings are never in Pat\'s cloud, and come back on leaving', async () => {
  // Sam's phone, Sam's own data
  add('Sam Savings', 9_000);
  useStore.setState({ phoneDataOwner: 'sam', assetRecordOwner: 'sam', onboardingComplete: true } as any);
  useStore.setState({ profileSync: startSync('sam', pickSyncFields(st())) } as any);
  mockFb.mockCloud.sam = { profile: { onboardingComplete: true }, stamps: {} };
  mockFb.mockCloud.pat = { profile: { onboardingComplete: true, assetAccounts: [{ asset_id: 'brk', label: 'Brokerage', balance: 30_000 }] }, stamps: {} };
  (global as any).mockHousehold = { sam: 'pat' };   // Sam has joined Pat's household
  render(<RootLayout />);
  await act(async () => { await signIn({ uid: 'sam', email: 's@s.com', metadata: {} }); });
  act(() => { useStore.setState({ hideBalances: true } as any); });
  await flush();
  await flush();
  expect(labels(st().assetAccounts)).toEqual([['Brokerage', 30_000]]);
  expect(st().assetRecordOwner).toBe('pat');
  for (const [, payload] of mockFb.saveUserData.mock.calls) expect(JSON.stringify(payload)).not.toContain('Sam Savings');
  expect(JSON.stringify(mockFb.mockCloud.pat)).not.toContain('Sam Savings');
  // Sam leaves: the next sign-in finds no household
  await act(async () => { await signIn(null); });
  (global as any).mockHousehold = {};
  await act(async () => { await signIn({ uid: 'sam', email: 's@s.com', metadata: {} }); });
  await flush();
  expect(labels(st().assetAccounts)).toEqual([['Sam Savings', 9_000]]);
  expect(JSON.stringify(mockFb.mockCloud.pat)).not.toContain('Sam Savings');
});

test('R15 Pat\'s unsaved Roth IRA $8,000 is set aside when Sam signs in, and merges into Pat\'s account when Pat returns', async () => {
  add('Checking', 4_000);
  useStore.setState({ phoneDataOwner: 'pat', assetRecordOwner: 'pat', onboardingComplete: true } as any);
  mockFb.mockCloud.pat = { profile: pickSyncFields(st()), stamps: {} };
  useStore.setState({ profileSync: startSync('pat', pickSyncFields(st())) } as any);
  mockFb.mockOffline.on = true;
  render(<RootLayout />);
  await act(async () => { await signIn({ uid: 'pat', email: 'p@p.com', metadata: {} }); });
  act(() => { add('Roth IRA', 8_000); });
  await flush();                                                       // stamped, not saved (offline)
  expect(Object.keys(st().profileSync.pending).some((k: string) => k.startsWith('assetAccounts#'))).toBe(true);
  // Sam signs in on Pat's phone
  mockFb.mockOffline.on = false;
  mockFb.mockCloud.sam = { profile: { onboardingComplete: true }, stamps: {} };
  await act(async () => { await signIn(null); });
  await act(async () => { await signIn({ uid: 'sam', email: 's@s.com', metadata: {} }); });
  await flush();
  expect(JSON.stringify(st().assetAccounts)).not.toContain('Roth IRA');
  expect(JSON.stringify(mockFb.mockCloud.sam)).not.toContain('Roth IRA');
  // Pat returns
  await act(async () => { await signIn(null); });
  await act(async () => { await signIn({ uid: 'pat', email: 'p@p.com', metadata: {} }); });
  act(() => { useStore.setState({ hideBalances: false } as any); });
  await flush();
  await flush();
  expect(labels(st().assetAccounts)).toEqual([['Checking', 4_000], ['Roth IRA', 8_000]]);
  expect(labels(mockFb.mockCloud.pat.profile.assetAccounts)).toEqual([['Checking', 4_000], ['Roth IRA', 8_000]]);
});

test('R16 + R11 (DEC-10813): Pat deletes and the household moves to Sam — what Sam set aside on joining ($9,000 savings) stays aside, never given back into the household\'s data', async () => {
  const { setAsideStorage } = require('../store/secureStorage');
  for (const a of await setAsideStorage.list()) await setAsideStorage.remove(a.key);   // earlier tests' set-asides
  await setAsideStorage.put('sam', '2026-11-10T00:00:00.000Z', { assetAccounts: [{ asset_id: 'sam-sav', label: 'Sam Savings', balance: 9_000 }] });
  // Sam's phone holds the household's data; the server moved the household to users/sam (movedFrom pat)
  useStore.setState({ phoneDataOwner: 'sam', assetRecordOwner: 'pat', onboardingComplete: true,
    assetAccounts: [{ asset_id: 'brk', label: 'Brokerage', balance: 30_000 }] } as any);
  mockFb.mockCloud.sam = { profile: { onboardingComplete: true, assetAccounts: [{ asset_id: 'brk', label: 'Brokerage', balance: 30_000 }] }, stamps: {} };
  (global as any).mockMovedFrom = { sam: 'pat' };
  render(<RootLayout />);
  await act(async () => { await signIn({ uid: 'sam', email: 's@s.com', metadata: {} }); });
  await flush();
  expect(st().assetRecordOwner).toBe('sam');
  expect(labels(st().assetAccounts)).toEqual([['Brokerage', 30_000]]);
  const asides = await setAsideStorage.list();
  expect(asides.map((a: any) => a.owner)).toEqual(['sam#before-joining-pat']);
  expect(JSON.stringify(asides[0].data)).toContain('Sam Savings');
});
