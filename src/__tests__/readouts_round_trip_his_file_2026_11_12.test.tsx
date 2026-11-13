/**
 * PHASE 3, STAGE 0 — THE ROUND TRIP ON HIS OWN FILE (2026-11-12). His Build 55 file (Individual Brokerage -2203, dated
 * Jun 21, 2026, total $169,664.71) imported through the real import screen, as compare_his_robinhood_file_2026_11_11 does;
 * then the master record READ OUT (asset-record-readouts.ts) beside the old copies: balance, value date, cash, every
 * holding's shares, paid and purchase dates, and the activity. Run on the store's record and on the one-time move.
 */
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useStore, SCREENS_READ_THE_RECORD } from '../store/useStore';
import { rowsInForce } from '../../MoneyKeel/functions/networth-and-performance/asset-record';

// THE SWITCH (2026-11-13): once the screens read the record, the copies they read ARE the read-outs, so the old copies and
// the record no longer differ — the differences these checks found while the old copies stood are none. The app moves an
// account onto the record ONCE, from the copies it held before; a move of copies already read out of the record is not a
// path it takes, so those checks run while the old copies stand
const whileOld = <T,>(d: T[]): T[] => (SCREENS_READ_THE_RECORD ? [] : d);
const whileOldCopies = SCREENS_READ_THE_RECORD ? test.skip : test;
import ImportHoldingsScreen from '../screens/ImportHoldingsScreen';
import { moveOldCopies } from '../../MoneyKeel/functions/networth-and-performance/asset-record-move';
import { readOuts, readOutDifferences, explainedDifference, type ReadOutDifference } from '../../MoneyKeel/functions/networth-and-performance/asset-record-readouts';
import { isoLocalDate } from '../domain/_shared/dates';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: (cb: any) => { const R = require('react'); R.useEffect(() => cb(), []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: ({ children }: any) => children,
}));

const FIXTURES = path.join(__dirname, '../screens/__tests__/__fixtures__');
const HIS_FILE = fs.readFileSync(path.join(FIXTURES, 'build55-nov4-26-jj_as-exported.csv'), 'utf8');
const RESAVED = fs.readFileSync(path.join(FIXTURES, 'build55-nov4-26-jj_resaved-2338.csv'), 'utf8');
const st = () => useStore.getState() as any;
const TODAY = isoLocalDate(new Date());

beforeEach(() => {
  jest.clearAllMocks();
  useStore.setState({ assetAccounts: [], transactions: [], priceCache: {}, refreshPrices: async () => {}, assetRecord: [], assetRecordQuestions: {}, assetRecordFaults: [] } as any);
});

async function importThroughScreen(file: string) {
  (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: 'file://Build55-nov4-26-jj.csv' }] });
  (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(file);
  render(<ImportHoldingsScreen />);
  fireEvent.press(screen.getByText('Choose a file'));
  await waitFor(() => expect(screen.getByLabelText('Which institution is this file from')).toBeTruthy());
  fireEvent.changeText(screen.getByLabelText('Which institution is this file from'), 'Robinhood');
  fireEvent.press(screen.getByLabelText(/Import 5 holdings/));
  await waitFor(() => { expect(st().assetAccounts.length).toBe(1); expect(st().assetRecord.length).toBeGreaterThan(0); });
  screen.unmount();
}

type Short = [what: ReadOutDifference['what'], holding: string | null, old: ReadOutDifference['old'], readOut: ReadOutDifference['readOut']];
const looked = { trips: 0, accounts: 0, holdings: 0 };
function roundTrip(record: any[]) {
  const old = { assetAccounts: st().assetAccounts, transactions: st().transactions };
  const read = readOuts({ assetRecord: record, assetAccounts: old.assetAccounts, transactions: old.transactions, priceCache: {} }, TODAY);
  const c = readOutDifferences(read, old);
  looked.trips++; looked.accounts += c.looked.accounts; looked.holdings += c.looked.holdings;
  return { read, short: c.differences.map((d) => [d.what, d.holding, d.old, d.readOut]) as Short[],
    unexplained: c.differences.filter((d) => explainedDifference(d, old, st().assetRecordQuestions, record) == null) };
}

const CD = 'KEY BANK CD CLEVELAND OH CD 3.85% 08/24/2026';
const PUT = "QQQ DEC 31 '26 $600 PUT";

test('(1) as exported: the store record reads out the old copies exactly — $169,664.71 on Jun 21, 4 holdings, their lots and first entries', async () => {
  await importThroughScreen(HIS_FILE);
  const r = roundTrip(st().assetRecord);
  expect(r.short).toEqual([]);
  const a = r.read.assetAccounts[0], o = st().assetAccounts[0];
  expect(a.balance).toBeCloseTo(169_664.71, 6);
  expect(a).toMatchObject({ value_as_of: '2026-06-21', cash_balance: 7_096.82, label: 'Individual Brokerage', source: 'imported' });
  // every lot, its own number included, reads back exactly as the old copy holds it (the CD per $100 of face, the put in contracts)
  expect(a.positions!.map((p) => [p.ticker, p.lots])).toEqual(o.positions.map((p: any) => [p.ticker, p.lots]));
  expect(a.positions!.find((p) => p.ticker === CD)!.lots[0]).toMatchObject({ shares: 110_000, cost_per_share: 100 });
  expect(a.positions!.find((p) => p.ticker === PUT)!.lots[0]).toMatchObject({ shares: 1, cost_per_share: 50.35 });
  expect(st().assetRecordFaults).toEqual([]);
});

whileOldCopies('(2) the one-time move of what the import left: read out exactly', async () => {
  await importThroughScreen(HIS_FILE);
  const moved = moveOldCopies([], st().assetAccounts, st().transactions, '2026-11-11T10:00:00.000Z').record;
  const r = roundTrip(moved);
  expect(r.short).toEqual([]);
  expect(r.read.assetAccounts[0].balance).toBeCloseTo(169_664.71, 6);
});

test('with the switch on, the import is one save: never moved as an old copy, Jun 21 saved once, each purchase once, $169,664.71', async () => {
  if (!SCREENS_READ_THE_RECORD) return;
  await importThroughScreen(HIS_FILE);
  const id = String(st().assetAccounts[0].asset_id);
  // the import is one save: the switch never moves it as an old copy, and the file's Jun 21 values are saved once
  expect(st().assetRecord.some((r: any) => r.kind === 'FACT' && r.ref === `moved-from-phone:${id}`)).toBe(false);
  expect(rowsInForce(st().assetRecord).filter((r: any) => r.accountId === id && r.kind === 'VALUE' && r.holding == null && r.date === '2026-06-21')).toHaveLength(1);
  // each of the four purchases is on the record once
  const buys = rowsInForce(st().assetRecord).filter((r: any) => r.accountId === id && r.kind === 'PURCHASE');
  expect(buys.map((r: any) => [r.holding, r.shares]).sort()).toEqual([[CD, 110_000], ['LCTX', 965], [PUT, 100], ['VMFXX', 50_000]].sort());
  // $109,992.74 CD + $1,167.65 LCTX + $1,407.50 put + $50,000 VMFXX + $7,096.82 cash = $169,664.71
  expect(st().assetAccounts[0].balance).toBeCloseTo(109_992.74 + 1_167.65 + 1_407.5 + 50_000 + 7_096.82, 6);
  expect(st().assetAccounts[0].value_as_of).toBe('2026-06-21');
});

test('a phone that lost its record never moves the copies read out of it: refused and said so, never −$4,146.21 or −$166,714.10', async () => {
  if (!SCREENS_READ_THE_RECORD) return;   // only the switch reads copies out of the record
  await importThroughScreen(HIS_FILE);
  const { assetAccounts, transactions } = st();
  const out = moveOldCopies([], assetAccounts, transactions, '2026-11-11T10:00:00.000Z');
  expect(out.moved).toEqual([]);
  expect(out.problems).toEqual([expect.stringMatching(/^not moved: Individual Brokerage holds copies read out of a record/)]);
  expect(out.record).toEqual([]);
  // the screens keep what the record gave: $169,664.71, cash $7,096.82
  expect(st().assetAccounts[0].balance).toBeCloseTo(169_664.71, 6);
  expect(st().assetAccounts[0].cash_balance).toBeCloseTo(7_096.82, 6);
});

test('(3) the re-saved file states no date: read out exactly but the value date, which stays blank on the record', async () => {
  await importThroughScreen(RESAVED);
  const was = st().assetAccounts[0].value_as_of;
  const r = roundTrip(st().assetRecord);
  // explained: the old copy dates the values by the phone's day of import; the record leaves the day blank and asks it
  expect(r.short).toEqual(whileOld([['value date', null, was, null]]));
  expect(r.unexplained).toEqual([]);
  expect(r.read.assetAccounts[0].balance).toBeCloseTo(169_664.71, 6);
});

test('the guard looked: 3 round trips, 3 accounts and 12 holdings compared', () => {
  // with the switch on the move's round trip does not run: 2 round trips, 2 accounts, 8 holdings
  expect(looked).toEqual(SCREENS_READ_THE_RECORD ? { trips: 2, accounts: 2, holdings: 8 } : { trips: 3, accounts: 3, holdings: 12 });
});
