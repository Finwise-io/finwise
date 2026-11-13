/** "UPDATE MONEYKEEL TO KEEP SAVING" FROM THE APP'S ROOT (update-to-keep-saving v01, 2026-11-12, cloud copy R8a): when the cloud's
 *  lowest allowed version is above this app's, the root saves nothing and raises the flag every tab's banner reads; an app at or
 *  above it saves and shows no banner. */
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
    loadMinAppVersion: jest.fn(async () => (global as any).mockMinVersion ?? null),
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
  useStore.setState({ user: null, householdId: null, assetRecordOwner: null, phoneDataOwner: null, profileSync: null, assetRecord: [], assetRecordQuestions: {}, assetRecordFaults: [], appUpdateNeeded: undefined } as any);
});
afterEach(() => jest.useRealTimers());

async function patTypes() {
  useStore.setState({ phoneDataOwner: 'pat', assetRecordOwner: 'pat', onboardingComplete: true } as any);
  mockFb.mockCloud.pat = { profile: pickSyncFields(st()), stamps: {} };
  useStore.setState({ profileSync: startSync('pat', pickSyncFields(st())) } as any);
  render(<RootLayout />);
  await act(async () => { await signIn({ uid: 'pat', email: 'p@p.com', metadata: {} }); });
  act(() => { add('Savings', 12_400); });
  await flush();
  await flush();
}

test('the cloud asks for 99.0.0: the banner’s flag is up, and nothing is saved — the typing waits on the phone', async () => {
  (global as any).mockMinVersion = '99.0.0';
  await patTypes();
  expect(st().appUpdateNeeded).toBe(true);
  expect(mockFb.saveUserData).not.toHaveBeenCalled();
  expect(labels(st().assetAccounts)).toEqual([['Savings', 12_400]]);
});

test('the cloud asks for 0.0.0, no newer than this app: no banner, and the save goes through', async () => {
  (global as any).mockMinVersion = '0.0.0';
  await patTypes();
  expect(st().appUpdateNeeded).toBe(false);
  expect(mockFb.saveUserData).toHaveBeenCalled();
});
