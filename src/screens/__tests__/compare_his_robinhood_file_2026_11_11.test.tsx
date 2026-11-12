/**
 * PHASE 2, STEP 7 — THE COMPARISON CHECK ON HIS OWN FILE (2026-11-11). His Build 55 file (Individual Brokerage -2203,
 * dated Jun 21, 2026, total $169,664.71) imported through the real import screen; then, for its account and every
 * holding, the master record's answer beside the old copies' answer (src/testing/compareRecordToOldCopies.ts).
 *
 * Five cases: (1) the file as exported; (2) the same file imported twice; (3) the file re-saved from a spreadsheet,
 * which states no date; (4) the one-time move of what an existing phone holds (moveOldCopies) onto an empty record;
 * (5) the record's total for the file's account is the file's own $169,664.71 on Jun 21, 2026, in cases 1 and 4.
 *
 * Every difference is pinned EXACTLY with the reason for it. A difference that shows the record is wrong starts FAULT:.
 * The first run (2026-11-11) found three faults and two limits of the comparison tool; all five are fixed 2026-11-11 and
 * each former FAULT is now an assertion of the fixed result:
 *   A. the file import counts an option in shares (1 contract → 100 shares at $50.35);
 *   B. the move prices a per-$100-of-face bond at cost ÷ 100 (the CD reads $110,000 paid);
 *   C. the move saves an imported account's facts (the CD's face, rate, maturity; the put's 100 a contract);
 *   the tool compares dates by day (an empty date and "(none)" no longer differ) and reads a per-$100 bond's cost per $100.
 */
import React from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useStore } from '../../store/useStore';
import ImportHoldingsScreen from '../ImportHoldingsScreen';
import { compareRecordToOldCopies, type Difference } from '../../testing/compareRecordToOldCopies';
import { moveOldCopies } from '../../../MoneyKeel/functions/networth-and-performance/asset-record-move';
import { valuesNow, rowsInForce, openPurchases, sharesOnRecord, factsOf } from '../../../MoneyKeel/functions/networth-and-performance/asset-record';
import { isoLocalDate } from '../../domain/_shared/dates';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: (cb: any) => { const R = require('react'); R.useEffect(() => cb(), []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
  Link: ({ children }: any) => children,
}));

const HIS_FILE = fs.readFileSync(path.join(__dirname, '__fixtures__/build55-nov4-26-jj_as-exported.csv'), 'utf8');
const RESAVED = fs.readFileSync(path.join(__dirname, '__fixtures__/build55-nov4-26-jj_resaved-2338.csv'), 'utf8');

/** What the file itself holds, counted from its own lines (never from memory): its accounts (the "Account Summary"
 *  lines ending in a 4-digit mask) and its holdings (the lines under the "Symbol, Last Price" header, minus CASH and
 *  TOTAL). */
function countFile(csv: string): { accounts: number; holdings: string[] } {
  const lines = csv.split(/\r?\n/);
  const accounts = lines.filter((l) => /^[^,]+ -\d{4},/.test(l)).length;
  const start = lines.findIndex((l) => /^Symbol,\s*Last Price/.test(l));
  const holdings: string[] = [];
  for (const l of lines.slice(start + 1)) {
    const first = l.split(',')[0].trim();
    if (!first || first === 'CASH') continue;
    if (first === 'TOTAL') break;
    holdings.push(first);
  }
  return { accounts, holdings };
}

const CD = 'KEY BANK CD CLEVELAND OH CD 3.85% 08/24/2026';
const PUT = "QQQ DEC 31 '26 $600 PUT";
const st = () => useStore.getState() as any;

beforeEach(() => {
  jest.clearAllMocks();
  useStore.setState({ assetAccounts: [], transactions: [], priceCache: {}, refreshPrices: async () => {}, assetRecord: [], assetRecordQuestions: {}, assetRecordFaults: [] } as any);
});

/** Drives the real import screen, as build55_his_import_file_2026_11_04.test.tsx does, and waits until this import's
 *  own lots and record rows are saved. */
async function importThroughScreen(file: string) {
  const lotsBefore = JSON.stringify((st().assetAccounts[0]?.positions ?? []).map((p: any) => p.lots.map((l: any) => l.lot_id)));
  (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: 'file://Build55-nov4-26-jj.csv' }] });
  (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(file);
  render(<ImportHoldingsScreen />);
  fireEvent.press(screen.getByText('Choose a file'));
  await waitFor(() => expect(screen.getByLabelText('Which institution is this file from')).toBeTruthy());
  fireEvent.changeText(screen.getByLabelText('Which institution is this file from'), 'Robinhood');
  fireEvent.press(screen.getByLabelText(/Import 5 holdings/));
  await waitFor(() => {
    expect(st().assetAccounts.length).toBe(1);
    expect(JSON.stringify(st().assetAccounts[0].positions.map((p: any) => p.lots.map((l: any) => l.lot_id)))).not.toBe(lotsBefore);
    expect(st().assetRecord.length).toBeGreaterThan(0);
  });
  screen.unmount();
  return st().assetAccounts[0] as any;
}

/** The differences without the account's generated id, so they can be pinned exactly. */
const pinned = (d: Difference[]) => d.map(({ accountId, ...rest }) => rest);

/** The differences cases 1, 2 and 3 share (the file's own lines, saved by the import): none since the fixes of
 *  2026-11-11 (before: CD paid read by the tool as $11,000,000; the put 1 share on the list; four blank purchase dates
 *  printed two ways). */
const FROM_THE_IMPORT: Omit<Difference, 'accountId'>[] = [];

test('the file holds 1 account and 4 holdings (counted from its own lines), in both copies of it', () => {
  expect(countFile(HIS_FILE)).toEqual({ accounts: 1, holdings: [CD, 'LCTX', "QQQ Dec 31 '26 $600 Put", 'VMFXX'] });
  expect(countFile(RESAVED)).toEqual(countFile(HIS_FILE));
});

test('(1) as exported, through the screen: 1 account and 4 holdings compared; the exact differences', async () => {
  const file = countFile(HIS_FILE);
  await importThroughScreen(HIS_FILE);
  const c = compareRecordToOldCopies(st().assetRecord, st().assetAccounts);
  expect(c.looked.accounts).toBeGreaterThanOrEqual(file.accounts);
  expect(c.looked.holdings).toBeGreaterThanOrEqual(file.holdings.length);
  expect(c.looked).toEqual({ accounts: 1, holdings: 4 });
  // value ($169,664.71) and value date (2026-06-21, the file's own day) agree, so neither is a difference
  expect(pinned(c.differences)).toEqual(FROM_THE_IMPORT);

  // A fixed 2026-11-11: the put is 100 shares at $50.35 on the record, as the old copy's 1 contract of 100 shares
  const id = String(st().assetAccounts[0].asset_id);
  expect(sharesOnRecord(st().assetRecord, id, PUT)).toBe(100);
  expect(openPurchases(st().assetRecord, id, PUT).map((o) => [o.shares, o.price])).toEqual([[100, 50.35]]);
  // the CD, read by hand: the record's paid is the right $110,000
  expect(openPurchases(st().assetRecord, id, CD).map((o) => o.shares * (o.price as number))).toEqual([110_000]);
  expect(st().assetRecordFaults).toEqual([]);
});

test('(2) imported twice: the record adds nothing the second time, and the comparison is unchanged', async () => {
  const file = countFile(HIS_FILE);
  await importThroughScreen(HIS_FILE);
  const recordOnce = st().assetRecord;
  const once = compareRecordToOldCopies(recordOnce, st().assetAccounts);
  await importThroughScreen(HIS_FILE);
  expect(st().assetAccounts.length).toBe(file.accounts);
  expect(st().assetRecord.length).toBe(recordOnce.length);
  expect(st().assetRecord).toEqual(recordOnce);
  const twice = compareRecordToOldCopies(st().assetRecord, st().assetAccounts);
  expect(twice.looked).toEqual({ accounts: 1, holdings: 4 });
  expect(twice.looked.holdings).toBeGreaterThanOrEqual(file.holdings.length);
  expect(pinned(twice.differences)).toEqual(pinned(once.differences));
  expect(pinned(twice.differences)).toEqual(FROM_THE_IMPORT);
});

test('(3) the re-saved file states no date: the same differences, plus the value date — the record stays undated', async () => {
  const file = countFile(RESAVED);
  await importThroughScreen(RESAVED);
  const acct = st().assetAccounts[0];
  const c = compareRecordToOldCopies(st().assetRecord, st().assetAccounts);
  expect(c.looked.accounts).toBeGreaterThanOrEqual(file.accounts);
  expect(c.looked.holdings).toBeGreaterThanOrEqual(file.holdings.length);
  expect(c.looked).toEqual({ accounts: 1, holdings: 4 });
  expect(pinned(c.differences)).toEqual([
    ...FROM_THE_IMPORT,
    // His ruling (an undated file stays undated and asks for a date): the old copy dates the values by the phone's
    // day of import; the record leaves the day blank and the account holder is asked it.
    { label: 'Individual Brokerage', holding: null, what: 'value date', old: isoLocalDate(new Date()), list: null },
  ]);
  expect(st().assetRecordQuestions[String(acct.asset_id)].needsADate).toBe(true);
  expect(valuesNow(st().assetRecord, String(acct.asset_id))!.total).toBeCloseTo(169_664.71, 6);
});

test('(4) the one-time move of what the import left, onto an empty record: 1 account and 4 holdings compared', async () => {
  const file = countFile(HIS_FILE);
  await importThroughScreen(HIS_FILE);
  const { assetAccounts, transactions } = st();
  const id = String(assetAccounts[0].asset_id);
  const out = moveOldCopies([], assetAccounts, transactions, '2026-11-11T10:00:00.000Z');
  expect(out.moved).toEqual([id]);
  expect([out.ask, out.problems]).toEqual([[], []]);
  const c = compareRecordToOldCopies(out.record, assetAccounts);
  expect(c.looked.accounts).toBeGreaterThanOrEqual(file.accounts);
  expect(c.looked.holdings).toBeGreaterThanOrEqual(file.holdings.length);
  expect(c.looked).toEqual({ accounts: 1, holdings: 4 });
  // nothing differs (the four blank purchase dates no longer differ since the tool compares dates by day, fixed 2026-11-11)
  expect(pinned(c.differences)).toEqual([]);

  // the move holds the put as 100 shares at $50.35, the same units as the import now does (A fixed 2026-11-11)
  expect(sharesOnRecord(out.record, id, PUT)).toBe(100);
  expect(openPurchases(out.record, id, PUT).map((o) => [o.shares, o.price])).toEqual([[100, 50.35]]);

  // B fixed 2026-11-11: the move prices the CD at cost ÷ 100, so 110,000 face at $1 = $110,000 paid, as the import does
  expect(openPurchases(out.record, id, CD).map((o) => [o.shares, o.price, o.shares * (o.price as number)])).toEqual([[110_000, 1, 110_000]]);
  expect(openPurchases(st().assetRecord, id, CD).map((o) => [o.shares, o.price])).toEqual([[110_000, 1]]);

  // C fixed 2026-11-11: the move saves the facts the import saves — the CD's face, rate, maturity and quote; the put's
  // 100 shares a contract
  for (const h of [CD, PUT]) {
    expect(Object.keys(factsOf(st().assetRecord, id, h)).length).toBeGreaterThan(0);
    expect(factsOf(out.record, id, h)).toEqual(factsOf(st().assetRecord, id, h));
  }
  expect(rowsInForce(out.record).filter((r) => r.kind === 'FACT').length).toBe(rowsInForce(st().assetRecord).filter((r) => r.kind === 'FACT').length);
});

test('(5) the record\'s total for the file\'s account is $169,664.71 dated 2026-06-21, after the import and after the move', async () => {
  const file = countFile(HIS_FILE);
  await importThroughScreen(HIS_FILE);
  const accounts = st().assetAccounts;
  expect(accounts.length).toBe(file.accounts);
  const moved = moveOldCopies([], accounts, st().transactions, '2026-11-11T10:00:00.000Z').record;
  for (const record of [st().assetRecord, moved]) {
    const now = accounts.map((a: any) => valuesNow(record, String(a.asset_id))!);
    expect(now.map((n: any) => n.date)).toEqual(['2026-06-21']);
    expect(now.reduce((t: number, n: any) => t + n.total, 0)).toBeCloseTo(169_664.71, 6);
    // each holding's value is the file's own: $109,992.74 + $1,167.65 + $1,407.50 + $50,000 + cash $7,096.82
    expect(now[0].holdings.map((h: any) => [h.holding, h.value])).toEqual([[CD, 109_992.74], ['LCTX', 1_167.65], [PUT, 1_407.5], ['VMFXX', 50_000]]);
    expect(now[0].cash).toBe(7_096.82);
  }
});
