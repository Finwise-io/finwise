/* PHASE 3, STAGE 1 — THE SEEDING HELPER, PROVED ON FIVE FIXTURES OF REAL TEST FILES (2026-11-12).
 * Each fixture below is copied exactly from the test file named beside it (none of those files is changed). Each is
 * seeded through src/testing/seedRecord.ts — the one-time move, the broker step for a linked account, the recorded days —
 * and the master record is then READ OUT beside the old copies the fixture holds. A fixture that reads out exactly can
 * switch to the read-outs with no change to what its test asserts. The five between them hold: linked accounts with
 * activity, a recorded day, an account built from its holdings with a price, a typed bond valued at what was paid, and a
 * typed account with lots and recorded activity. */
import { useStore, SCREENS_READ_THE_RECORD } from '../store/useStore';

// THE SWITCH (2026-11-13): once the screens read the record, the copies they read ARE the read-outs, so the old copies and
// the record no longer differ — the differences these checks found while the old copies stood are none
const whileOld = <T,>(d: T[]): T[] => (SCREENS_READ_THE_RECORD ? [] : d);
import { seedRecord } from '../testing/seedRecord';
import { recordedDay } from '../testing/recordedDay';
import { readOuts, readOutDifferences, explainedDifference } from '../../MoneyKeel/functions/networth-and-performance/asset-record-readouts';

const TODAY = '2026-11-12';
const st = () => useStore.getState() as any;
const looked = { fixtures: 0, accounts: 0, holdings: 0, activity: 0 };

/** The fixture seeded through the record, then read out beside its own old copies. */
function seedAndReadOut(state: Record<string, unknown>) {
  useStore.getState().resetAll();
  const seeded = seedRecord(state);
  const s = st();
  const old = { assetAccounts: s.assetAccounts, transactions: s.transactions };
  const read = readOuts(s, TODAY);
  const c = readOutDifferences(read, old);
  looked.fixtures++; looked.accounts += c.looked.accounts; looked.holdings += c.looked.holdings; looked.activity += c.looked.activity;
  const unexplained = c.differences.filter((d) => explainedDifference(d, old, s.assetRecordQuestions, s.assetRecord) == null);
  return { seeded, read, differences: c.differences.map((d) => [d.what, d.accountId, d.holding, d.old, d.readOut]), unexplained, faults: s.assetRecordFaults };
}

test('1 · src/screens/__tests__/networth_v08.test.tsx "with accounts": two linked accounts and a recorded day of Aug 3', () => {
  const syncedAt = '2026-11-12T08:00:00.000Z';
  const r = seedAndReadOut({
    assetAccounts: [
      { asset_id: 'chk', label: 'Chase Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 8000, target_return: 0, source: 'connected', last_synced: syncedAt },
      { asset_id: 'van', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 355152, target_return: 0.07, source: 'connected', last_synced: syncedAt,
        positions: [{ position_id: 'p1', ticker: 'VTI', asset_class: 'stock_etf', last_price: 355152, lots: [{ lot_id: 'l1', shares: 1, cost_per_share: 300000, purchase_date: '2024-01-02' }] }] },
    ],
    snapshotDays: [recordedDay('2026-08-03', [['chk', 8000, 'cash'], ['van', 353242]])],
  });
  // with the switch on, the day the broker's update states (Nov 12) is read out onto the days at once, beside Aug 3
  expect(r.seeded).toMatchObject({ moved: 0, linked: 2, days: SCREENS_READ_THE_RECORD ? 2 : 1 });
  expect(r.faults).toEqual([]);
  // explained: a linked account's old copy carries no value date and no cash figure; the broker's update states both
  expect(r.differences).toEqual(whileOld([['value date', 'chk', null, null, '2026-11-12'], ['cash', 'chk', null, null, 8000],
    ['value date', 'van', null, null, '2026-11-12'], ['cash', 'van', null, null, 0]]));
  expect(r.unexplained).toEqual([]);
  expect(r.read.assetAccounts.map((a) => a.balance)).toEqual([8000, 355152]);
  // the recorded day reads back: $8,000 checking + $353,242 brokerage = $361,242 on Aug 3
  expect(r.read.invDaily['2026-08-03']).toBe(361_242);
});

test('2 · src/screens/__tests__/account_page_full_precision.test.tsx: a linked account with two dividends of $0.10 and $0.20', () => {
  const r = seedAndReadOut({
    assetAccounts: [{ asset_id: 'p1', label: 'Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', source: 'connected', last_synced: '2026-11-12T08:00:00.000Z', balance: 3220,
      positions: [
        { position_id: 'v', ticker: 'VTI', asset_class: 'stock_etf', last_price: 250, lots: [{ lot_id: 'l1', shares: 10, cost_per_share: 200, purchase_date: '2025-01-02' }] },
        { position_id: 'b', ticker: 'BND', asset_class: 'stock_etf', last_price: 72, lots: [{ lot_id: 'l2', shares: 10, cost_per_share: 70, purchase_date: '2025-01-02' }] }] }],
    transactions: [
      { id: 'd1', date: '2026-09-01', type: 'DIVIDEND', amount: 0.1, ticker: 'VTI', account_id: 'p1', source: 'connected' },
      { id: 'd2', date: '2026-09-02', type: 'DIVIDEND', amount: 0.2, ticker: 'BND', account_id: 'p1', source: 'connected' }],
  });
  expect(r.seeded).toMatchObject({ linked: 1 });
  expect(r.faults).toEqual([]);
  expect(r.differences).toEqual(whileOld([['value date', 'p1', null, null, '2026-11-12'], ['cash', 'p1', null, null, 0]]));
  expect(r.unexplained).toEqual([]);
  expect(r.read.transactions.map((t) => [t.type, t.ticker, t.amount])).toEqual([['DIVIDEND', 'BND', 0.2], ['DIVIDEND', 'VTI', 0.1]]);
});

test('3 · src/__tests__/dec_0403_saved_exact.test.ts: built from its holdings, 3 ABC at the feed’s $33.3333 → $99.9999 exact', () => {
  const r = seedAndReadOut({
    assetAccounts: [{ asset_id: 'b1', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 3 * 33.3333, target_return: 0.07, derive_balance: true,
      positions: [{ position_id: 'p', ticker: 'ABC', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 3, cost_per_share: 30, purchase_date: '2026-01-02' }] }] }],
    priceCache: { ABC: { ticker: 'ABC', points: [{ date: '2026-10-19', close: 33.3333 }] } },
    transactions: [],
  });
  expect(r.seeded).toMatchObject({ moved: 1, linked: 0 });
  // explained: the fixture holds the tax lot with no first entry in its activity; the record holds the lot as its purchase
  // the same with the switch on: the screens keep the activity as the account holder had it — a tax lot typed as already owned
  // is a first entry only where the activity held one (screensReadTheRecord)
  expect(r.differences).toEqual([['activity only in the read-out', 'b1', 'ABC', null, 'OPENING_POSITION|b1|ABC|2026-01-02|3.000000|30.000000|']]);
  expect(r.unexplained).toEqual([]);
  expect(r.read.assetAccounts[0].balance).toBeCloseTo(99.9999, 10);
});

test('4 · src/screens/__tests__/outside_networth_final_openai_bonds.test.tsx M-024: a Treasury note $9,800, face $10,000, no coupon rate', () => {
  const r = seedAndReadOut({
    assetAccounts: [{ asset_id: 'b', label: 'Treasury note', kind: 'fixed_income', asset_class: 'bonds', tax_bucket: 'TAXABLE', balance: 9800, face_value: 10000, maturity_date: '2031-06-01' }],
  });
  expect(r.seeded).toMatchObject({ moved: 1 });
  expect(r.differences).toEqual([]);
  expect(r.read.assetAccounts[0]).toMatchObject({ balance: 9800, face_value: 10000, maturity_date: '2031-06-01' });
});

test('5 · src/__tests__/compare_typed_households_2026_11_11.test.ts: typed $5,000 with a BUY, a SELL and a DIVIDEND, as the store left them', () => {
  // the old copies exactly as that test's store actions end (balance $5,012, cash $12 not entered, 15 VTI)
  const r = seedAndReadOut({
    assetAccounts: [{ asset_id: 'bk', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 5_012, target_return: 0.07, source: 'manual', cash_balance: 12, cash_not_entered: true,
      positions: [{ position_id: 'pv', ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'lv', shares: 15, cost_per_share: 100, purchase_date: '2026-10-01' }] }] }],
    transactions: [
      { id: 't3', date: '2026-10-20', type: 'DIVIDEND', account_id: 'bk', ticker: 'VTI', amount: 12, created_at: '2026-11-11T10:00:03Z' },
      { id: 't2', date: '2026-10-15', type: 'SELL', account_id: 'bk', ticker: 'VTI', shares: 5, price: 120, created_at: '2026-11-11T10:00:02Z' },
      { id: 't1', date: '2026-10-01', type: 'BUY', account_id: 'bk', ticker: 'VTI', shares: 20, price: 100, created_at: '2026-11-11T10:00:01Z' }],
  });
  expect(r.seeded).toMatchObject({ moved: 1 });
  expect(r.differences).toEqual([
    // explained (DEC-10749): the move saves the 15 held as the tax lot, never the BUY of 20 it came from — the same with
    // the switch on, where the screens keep the activity as the account holder had it
    ['activity only in the old copy', 'bk', 'VTI', 'BUY|bk|VTI|2026-10-01|20.000000|100.000000|', null],
    ['activity only in the read-out', 'bk', 'VTI', null, 'OPENING_POSITION|bk|VTI|2026-10-01|15.000000|100.000000|'],
  ]);
  expect(r.unexplained).toEqual([]);
  expect(r.read.assetAccounts[0]).toMatchObject({ balance: 5_012, cash_balance: 12, cash_not_entered: true });
});

test('the guard looked: 5 fixtures, 6 accounts, 5 holdings, 5 activity records', () => {
  expect(looked).toEqual({ fixtures: 5, accounts: 6, holdings: 5, activity: 5 });
});
