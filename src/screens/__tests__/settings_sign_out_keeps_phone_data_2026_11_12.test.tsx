/** OUTSIDE CHECK 2, 2026-11-12 — SIGN-OUT, AND WHAT THE PHONE KEEPS.
 *
 *  User A signed out, user B signed in, B's profile load failed, and A's accounts (Savings $12,400, Brokerage $30,000 with
 *  100 VTI) were moved into B's record. The fix is in app/_layout.tsx: nothing is moved or saved before B's own profile has
 *  loaded, and a phone whose data was A's never moves it onto B's record. Sign-out itself keeps the phone's data, as its
 *  message says — activity and daily values live only on the phone, so clearing them would lose them — and sends what is
 *  waiting to the cloud first.
 */
import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import SettingsScreen from '../SettingsScreen';

const firebase = require('../../services/firebase');

beforeEach(() => {
  jest.restoreAllMocks();
  useStore.setState({ user: { uid: 'uidA', email: 'a@b.com', name: 'A' }, snaptradeConnections: [], assetAccounts: [], assetRecord: [],
    assetRecordQuestions: {}, assetRecordFaults: [] } as any);
});

test('Sign out: what is waiting goes to the cloud first; A\'s Savings $12,400, Brokerage $30,000 with 100 VTI, the record and its owner stay on the phone; the message is unchanged', async () => {
  const s: any = useStore.getState();
  s.addAsset({ label: 'A Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 12_400, source: 'manual', value_as_of: '2026-11-01' });
  s.addAsset({ label: 'A Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 30_000, source: 'manual', value_as_of: '2026-11-01' });
  (useStore.getState() as any).addPosition(String((useStore.getState() as any).assetAccounts[1].asset_id),
    { ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 100, cost_per_share: 80, purchase_date: '2025-03-03' }] });
  useStore.setState({ assetRecordOwner: 'uidA' } as any);
  const rowsBefore = (useStore.getState() as any).assetRecord.length;
  expect(rowsBefore).toBeGreaterThan(0);

  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const flush = jest.fn(() => Promise.resolve());
  firebase.flushBeforeSignOut = flush;
  render(<SettingsScreen />);
  fireEvent.press(screen.getByText('Sign out'));
  const [title, body, buttons] = alert.mock.calls[0] as [string, string, { text: string; onPress?: () => Promise<void> }[]];
  expect(title).toBe('Sign out');
  expect(body).toBe('Are you sure you want to sign out? Your data is saved on this device.');
  await act(async () => { await buttons.find((b) => b.text === 'Sign out')!.onPress!(); });

  expect(flush).toHaveBeenCalledTimes(1);                       // what was waiting went to the cloud first
  expect(firebase.logoutUser).toHaveBeenCalled();
  const after: any = useStore.getState();
  expect(after.user).toBeNull();
  expect(after.assetAccounts.map((a: any) => a.label).sort()).toEqual(['A Brokerage', 'A Savings']);
  expect(after.assetRecord).toHaveLength(rowsBefore);
  expect(after.assetRecordOwner).toBe('uidA');                  // so the next sign-in knows whose this phone's data is
});
