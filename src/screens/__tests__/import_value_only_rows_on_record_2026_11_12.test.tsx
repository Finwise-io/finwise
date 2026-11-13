/**
 * OUTSIDE CHECK, 2026-11-12 — A ROW WITH A VALUE AND NO QUANTITY, IMPORTED THROUGH THE REAL IMPORT SCREEN. A file with
 * 10 AAPL ($2,000), a $5,000 bond with no quantity and $1,000 cash, dated Jun 21, 2026: the app saves the bond as its
 * own account (valueOnlyAccountsOf). The master record must agree with it — the file's account $3,000, the bond's own
 * account $5,000, both on Jun 21 — and a file holding only such a row must still reach the record.
 */
import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useStore } from '../../store/useStore';
import ImportHoldingsScreen from '../ImportHoldingsScreen';
import { valuesNow } from '../../../MoneyKeel/functions/networth-and-performance/asset-record';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: (cb: any) => { const R = require('react'); R.useEffect(() => cb(), []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: ({ children }: any) => children,
}));

const st = () => useStore.getState() as any;
const H = 'Symbol,Quantity,Price Paid $,Last Price $,Value $,Date Acquired\n';
const BOND = 'US TREASURY BOND 4% 2030';

beforeEach(() => {
  jest.clearAllMocks();
  useStore.setState({ assetAccounts: [], transactions: [], priceCache: {}, refreshPrices: async () => {}, assetRecord: [], assetRecordQuestions: {}, assetRecordFaults: [] } as any);
});

async function importThroughScreen(file: string, button: RegExp, accounts: number) {
  (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: 'file://holdings.csv' }] });
  (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(file);
  render(<ImportHoldingsScreen />);
  fireEvent.press(screen.getByText('Choose a file'));
  await waitFor(() => expect(screen.getByLabelText('Which institution is this file from')).toBeTruthy());
  fireEvent.changeText(screen.getByLabelText('Which institution is this file from'), 'Fidelity');
  fireEvent.press(screen.getByLabelText(button));
  await waitFor(() => expect(st().assetAccounts.length).toBe(accounts));
  screen.unmount();
}

test('10 AAPL, a $5,000 bond with no quantity and $1,000 cash: the record holds $3,000 on the file\'s account and $5,000 on the bond\'s own, both on Jun 21', async () => {
  await importThroughScreen(H + 'AAPL,10,150,200,2000,01/05/2026\n' + BOND + ',,,,5000,\nCASH,,,,1000,\nGenerated at Jun 21 2026 03:37 PM ET\n', /Import 3 holdings/, 2);
  const main = st().assetAccounts.find((a: any) => (a.positions ?? []).length > 0);
  const bond = st().assetAccounts.find((a: any) => a.label === BOND);
  expect(main.balance).toBe(3000);
  expect(bond.balance).toBe(5000);
  expect(valuesNow(st().assetRecord, String(main.asset_id))).toMatchObject({ date: '2026-06-21', total: 3000 });
  expect(valuesNow(st().assetRecord, String(bond.asset_id))).toMatchObject({ date: '2026-06-21', total: 5000, source: 'file' });
  expect(st().assetRecordFaults).toEqual([]);
});

test('a file holding only the $5,000 bond: the bond\'s own account reaches the record, $5,000 on Jun 21', async () => {
  await importThroughScreen(H + BOND + ',,,,5000,\nGenerated at Jun 21 2026 03:37 PM ET\n', /Import 1 holding/, 1);
  const bond = st().assetAccounts[0];
  expect(bond.label).toBe(BOND);
  expect(valuesNow(st().assetRecord, String(bond.asset_id))).toMatchObject({ date: '2026-06-21', total: 5000, source: 'file' });
  expect(st().assetRecordFaults).toEqual([]);
});

test('the same file with the $5,000 bond imported twice: the bond keeps its one account, and the record holds $5,000 for it once', async () => {
  const FILE = H + 'AAPL,10,150,200,2000,01/05/2026\n' + BOND + ',,,,5000,\nCASH,,,,1000,\nGenerated at Jun 21 2026 03:37 PM ET\n';
  await importThroughScreen(FILE, /Import 3 holdings/, 2);
  const firstBond = st().assetAccounts.find((a: any) => a.label === BOND);
  const rowsAfterFirst = st().assetRecord.length;
  await importThroughScreen(FILE, /Import 3 holdings/, 2);
  const bonds = st().assetAccounts.filter((a: any) => a.label === BOND);
  expect(bonds.map((a: any) => [a.asset_id, a.balance])).toEqual([[firstBond.asset_id, 5000]]);
  expect(st().assetAccounts.length).toBe(2);
  expect(valuesNow(st().assetRecord, String(firstBond.asset_id))).toMatchObject({ date: '2026-06-21', total: 5000, source: 'file' });
  // re-importing the same file adds nothing to the record
  expect(st().assetRecord.length).toBe(rowsAfterFirst);
  expect(st().assetRecordFaults).toEqual([]);
});
