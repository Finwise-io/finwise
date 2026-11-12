/* PHASE 2, STEP 7 — THE COMPARISON CHECK, ACCOUNTS TYPED BY HAND (source 'manual'), 2026-11-11.
 *
 * Every case is run down BOTH roads an account typed by hand takes onto the master record:
 *   (1) the store road — the real store actions, called as the screens call them, write the list beside the old copies;
 *   (2) the one-time move — the same old copies the store ended with (accounts and transactions) moved onto an empty list
 *       by moveOldCopies, as a phone that held them before today is moved on opening.
 * Each road's list is compared with the old copies by compareRecordToOldCopies. Every difference is pinned EXACTLY, with
 * the reason: one of the faults the rulings fix (dates nobody gave stay blank, never the phone's date; an unknown is never
 * $0; a typed value carries its "Value as of" date; a bond's or CD's paid or face figure is a fact, not a value), or a
 * comment starting FAULT: where the list is wrong.
 *
 * A guard must prove it looked: every case asserts the accounts and holdings compared, and the last test asserts the
 * totals over all cases. No production code is changed by this file. */
import { useStore } from '../store/useStore';
import { compareRecordToOldCopies, type Difference } from '../testing/compareRecordToOldCopies';
import { moveOldCopies } from '../../MoneyKeel/functions/networth-and-performance/asset-record-move';
import { rowsInForce, sharesOnRecord, valuesNow, factsOf, openPurchases, type AssetRow } from '../../MoneyKeel/functions/networth-and-performance/asset-record';
import { ALL_PERSONAS } from '../testing/personas';

const AT = '2026-11-11T10:00:00.000Z';
const st = () => useStore.getState() as any;
const reset = () => useStore.setState({ assetAccounts: [], transactions: [], liabilities: [], priceCache: {}, txnFlags: [], allocatedByMonth: {},
  snaptradeConnections: [], wrapperConfirmQueue: [], assetRecord: [], assetRecordQuestions: {}, assetRecordFaults: [] } as any);
const idOf = (label: string) => String(st().assetAccounts.find((a: any) => a.label === label).asset_id);

/** What the cases looked at, added up for the coverage line. */
const total = { cases: 0, accounts: 0, holdings: 0 };
type Short = [label: string, holding: string | null, what: Difference['what'], old: Difference['old'], list: Difference['list']];
const short = (ds: Difference[]): Short[] => ds.map((d) => [d.label, d.holding, d.what, d.old, d.list]);

/** Both roads for what the store holds now. */
function bothRoads() {
  const accounts = st().assetAccounts, txns = st().transactions;
  const store = compareRecordToOldCopies(st().assetRecord, accounts);
  const moved = moveOldCopies([], accounts, txns, AT);
  const move = compareRecordToOldCopies(moved.record, accounts);
  total.cases++; total.accounts += store.looked.accounts + move.looked.accounts; total.holdings += store.looked.holdings + move.looked.holdings;
  return { store, move, storeRecord: st().assetRecord as AssetRow[], moveRecord: moved.record, moveProblems: moved.problems };
}

beforeEach(reset);
afterEach(() => expect(st().assetRecordFaults).toEqual([]));

test('every persona through seedNetWorth (retiree75 $250,000 portfolio; employedPartner $120,000 Traditional + $45,000 investments; the other five seed nothing): both roads agree, every value undated', () => {
  const seen: Record<string, number> = {};
  for (const p of ALL_PERSONAS) {
    reset();
    st().seedNetWorth(p.op);
    const r = bothRoads();
    seen[p.name] = r.store.looked.accounts;
    expect(r.move.looked.accounts).toBe(r.store.looked.accounts);
    expect(r.store.differences).toEqual([]);
    expect(r.move.differences).toEqual([]);
    // a sign-up answer is a value nobody dated: it stays blank on both roads, never the phone's date
    for (const a of st().assetAccounts) {
      expect(valuesNow(r.storeRecord, String(a.asset_id))).toMatchObject({ date: null, total: a.balance });
      expect(valuesNow(r.moveRecord, String(a.asset_id))).toMatchObject({ date: null, total: a.balance });
    }
  }
  expect(Object.keys(seen)).toHaveLength(7);
  expect(seen).toEqual({ retiree75: 1, employedPartner: 2, studentAid: 0, hourlyServer: 0, simpleFlat: 0, twoEarnersBoth401k: 0, allSkip: 0 });
  expect(st().assetRecordFaults).toEqual([]);
});

test('Savings $12,400 typed with Value as of Sep 1 2026: both roads list $12,400 on Sep 1, nothing differs', () => {
  st().addAsset({ label: 'Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 12_400, source: 'manual', value_as_of: '2026-09-01' });
  const r = bothRoads();
  expect(r.store.looked).toEqual({ accounts: 1, holdings: 0 });
  expect(r.move.looked).toEqual({ accounts: 1, holdings: 0 });
  expect(short(r.store.differences)).toEqual([]);
  expect(short(r.move.differences)).toEqual([]);
  expect(valuesNow(r.storeRecord, idOf('Savings'))).toMatchObject({ date: '2026-09-01', total: 12_400 });
  expect(valuesNow(r.moveRecord, idOf('Savings'))).toMatchObject({ date: '2026-09-01', total: 12_400 });
});

test('Savings $5,000 typed with no Value as of: both roads list $5,000 undated (never the phone date), nothing differs', () => {
  st().addAsset({ label: 'Savings', kind: 'savings', tax_bucket: 'CASH', balance: 5_000, source: 'manual' });
  const r = bothRoads();
  expect(r.store.looked).toEqual({ accounts: 1, holdings: 0 });
  expect(short(r.store.differences)).toEqual([]);
  expect(short(r.move.differences)).toEqual([]);
  expect(valuesNow(r.storeRecord, idOf('Savings'))).toMatchObject({ date: null, total: 5_000 });
  expect(valuesNow(r.moveRecord, idOf('Savings'))).toMatchObject({ date: null, total: 5_000 });
});

test('Savings $1,000 as of Sep 1 → updateAsset $1,200 as of Oct 1 → label changed: both roads list $1,200 on Oct 1', () => {
  st().addAsset({ label: 'Savings', kind: 'savings', tax_bucket: 'CASH', balance: 1_000, source: 'manual', value_as_of: '2026-09-01' });
  st().updateAsset(idOf('Savings'), { balance: 1_200, value_as_of: '2026-10-01' });
  st().updateAsset(idOf('Savings'), { label: 'Ally savings' });
  const r = bothRoads();
  expect(r.store.looked).toEqual({ accounts: 1, holdings: 0 });
  expect(short(r.store.differences)).toEqual([]);
  expect(short(r.move.differences)).toEqual([]);
  expect(valuesNow(r.storeRecord, idOf('Ally savings'))).toMatchObject({ date: '2026-10-01', total: 1_200 });
  // the store road keeps the Sep 1 value as history; the move keeps only what the old copies still hold
  expect(rowsInForce(r.storeRecord).filter((x) => x.kind === 'VALUE').map((x) => [x.date, x.typedValue])).toEqual([['2026-09-01', 1_000], ['2026-10-01', 1_200]]);
  expect(rowsInForce(r.moveRecord).filter((x) => x.kind === 'VALUE').map((x) => [x.date, x.typedValue])).toEqual([['2026-10-01', 1_200]]);
});

test('Savings $1,000 as of Nov 1 2026, then allocateSavings $500 today: old copies $1,500; store list $1,000 on Nov 1 + a $500 deposit; move lists $1,500 on Nov 1', () => {
  st().addAsset({ label: 'Savings', kind: 'savings', tax_bucket: 'CASH', balance: 1_000, source: 'manual', value_as_of: '2026-11-01' });
  st().allocateSavings('2026-11', [{ assetId: idOf('Savings'), amount: 500 }]);
  const r = bothRoads();
  expect(r.store.looked).toEqual({ accounts: 1, holdings: 0 });
  expect(short(r.store.differences)).toEqual([
    // phase 3: the value-today reader. The store's list holds the $1,000 value of Nov 1 and the $500 deposit dated
    // today, but its value now (valuesNow) reads the last value only and leaves the later $500 out.
    ['Savings', null, 'value', 1_500, 1_000],
  ]);
  expect(rowsInForce(r.storeRecord).filter((x) => x.kind === 'DEPOSIT').map((x) => x.amount)).toEqual([500]);
  // the old copies never recorded when the $500 arrived: allocateSavings raised the balance without moving "Value as of",
  // so the move lists $1,500 on Nov 1 and writes no deposit — no difference to the old copies, but the two roads
  // disagree on the same account ($1,000 vs $1,500)
  expect(short(r.move.differences)).toEqual([]);
  expect(valuesNow(r.moveRecord, idOf('Savings'))).toMatchObject({ date: '2026-11-01', total: 1_500 });
  expect(rowsInForce(r.moveRecord).filter((x) => x.kind === 'DEPOSIT')).toEqual([]);
});

test('Brokerage typed $0, then addPosition VTI: 100 at $80 on Mar 3 2025, 10 at $90 with no purchase date, 5 with no cost on Jun 2 2025 (115 shares)', () => {
  st().addAsset({ label: 'Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, source: 'manual' });
  const id = idOf('Brokerage');
  st().addPosition(id, { ticker: 'VTI', kind: 'stocks_etf', lots: [
    { lot_id: 'l1', shares: 100, cost_per_share: 80, purchase_date: '2025-03-03' },
    { lot_id: 'l2', shares: 10, cost_per_share: 90 },
    { lot_id: 'l3', shares: 5, purchase_date: '2025-06-02' },
  ] });
  const r = bothRoads();
  expect(r.store.looked).toEqual({ accounts: 1, holdings: 1 });
  expect(r.move.looked).toEqual({ accounts: 1, holdings: 1 });
  // shares, paid and purchase dates agree on both roads: 115 shares; paid unknown on both sides (the 5 with no cost is
  // not $0); the lot with no date stays blank on the list, never the phone's date
  for (const rec of [r.storeRecord, r.moveRecord]) {
    expect(sharesOnRecord(rec, id, 'VTI')).toBe(115);
    expect(openPurchases(rec, id, 'VTI').map((o) => [o.date, o.shares, o.price]).sort()).toEqual([['2025-03-03', 100, 80], ['2025-06-02', 5, null], [null, 10, 90]].sort());
  }
  // fixed 2026-11-11: an account typed by hand that is not built from its holdings (derive_balance not true) is valued
  // by the total the account holder typed, its holdings a tracked part of it — so both roads now list the typed $0,
  // undated, and agree (the move had left it blank, the store had kept $0)
  expect(short(r.store.differences)).toEqual([]);
  expect(short(r.move.differences)).toEqual([]);
  expect(valuesNow(r.storeRecord, id)).toMatchObject({ date: null, total: 0 });
  expect(valuesNow(r.moveRecord, id)).toMatchObject({ date: null, total: 0 });
});

test('Brokerage typed $0 with VTI handed in with the account (Import holdings): 50 at $200 on Jan 2 2024', () => {
  st().addAsset({ label: 'Imported by hand', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, source: 'manual',
    positions: [{ position_id: 'pp', ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'i1', shares: 50, cost_per_share: 200, purchase_date: '2024-01-02' }] }] });
  const r = bothRoads();
  expect(r.store.looked).toEqual({ accounts: 1, holdings: 1 });
  const id = idOf('Imported by hand');
  for (const rec of [r.storeRecord, r.moveRecord]) expect(openPurchases(rec, id, 'VTI').map((o) => [o.date, o.shares, o.price])).toEqual([['2024-01-02', 50, 200]]);
  // fixed 2026-11-11: not built from its holdings, so its typed total ($0, undated) is its value on both roads
  expect(short(r.store.differences)).toEqual([]);
  expect(short(r.move.differences)).toEqual([]);
  for (const rec of [r.storeRecord, r.moveRecord]) expect(valuesNow(rec, id)).toMatchObject({ date: null, total: 0 });
});

test('Brokerage typed $5,000: BUY 20 VTI at $100 Oct 1, SELL 5 at $120 Oct 15, DIVIDEND $12 Oct 20 → 15 VTI at $100; then the sale deleted → 20', () => {
  st().addAsset({ label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 5_000, source: 'manual' });
  const id = idOf('Brokerage');
  st().recordTransaction({ type: 'BUY', account_id: id, ticker: 'VTI', shares: 20, price: 100, date: '2026-10-01' });
  st().recordTransaction({ type: 'SELL', account_id: id, ticker: 'VTI', shares: 5, price: 120, date: '2026-10-15' });
  st().recordTransaction({ type: 'DIVIDEND', account_id: id, ticker: 'VTI', amount: 12, date: '2026-10-20' });
  // the old copies: balance $5,012 (the typed $5,000 plus the $12 dividend), cash $12 that the app opened itself
  expect(st().assetAccounts[0]).toMatchObject({ balance: 5_012, cash_balance: 12, cash_not_entered: true });
  const r = bothRoads();
  expect(r.store.looked).toEqual({ accounts: 1, holdings: 1 });
  expect(r.move.looked).toEqual({ accounts: 1, holdings: 1 });
  // shares, paid and dates agree on both roads: 15 VTI left of the Oct 1 purchase, $1,500 paid
  for (const rec of [r.storeRecord, r.moveRecord]) expect(openPurchases(rec, id, 'VTI').map((o) => [o.date, o.shares, o.price])).toEqual([['2026-10-01', 15, 100]]);
  expect(short(r.store.differences)).toEqual([
    // phase 3: the value-today reader. The store's list holds the $12 dividend of Oct 20 as its own row, but its value
    // now (valuesNow) reads the undated $5,000 typed value alone, where the old copies add the dividend ($5,012).
    ['Brokerage', null, 'value', 5_012, 5_000],
  ]);
  // fixed 2026-11-11: the move writes the total the old copies hold as typed ($5,012, which already counts the dividend)
  // and never the $12 cash the app opened itself (cash_not_entered); it had listed $12
  expect(short(r.move.differences)).toEqual([]);
  expect(valuesNow(r.moveRecord, id)).toMatchObject({ date: null, total: 5_012 });
  expect(r.moveProblems).toEqual([]);
  // the sale deleted: back to 20 VTI on the store road, the same differences in value
  expect(st().deleteTransaction(st().transactions.find((t: any) => t.type === 'SELL').id)).toBe(true);
  const after = bothRoads();
  expect(after.store.looked).toEqual({ accounts: 1, holdings: 1 });
  expect(sharesOnRecord(after.storeRecord, id, 'VTI')).toBe(20);
  expect(sharesOnRecord(after.moveRecord, id, 'VTI')).toBe(20);
  expect(short(after.store.differences)).toEqual([['Brokerage', null, 'value', 5_012, 5_000]]);   // phase 3: the value-today reader (as above)
  expect(short(after.move.differences)).toEqual([]);                                              // fixed 2026-11-11 (as above)
});

test('Brokerage typed $0: BUY 20 VTI at $100 Oct 1, then updatePosition changes that lot to $95 ($1,900 paid)', () => {
  st().addAsset({ label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, source: 'manual' });
  const id = idOf('Brokerage');
  st().recordTransaction({ type: 'BUY', account_id: id, ticker: 'VTI', shares: 20, price: 100, date: '2026-10-01' });
  const p = st().assetAccounts[0].positions[0];
  st().updatePosition(id, p.position_id, { lots: [{ ...p.lots[0], cost_per_share: 95 }] });
  const r = bothRoads();
  expect(r.store.looked).toEqual({ accounts: 1, holdings: 1 });
  expect(r.move.looked).toEqual({ accounts: 1, holdings: 1 });
  // the store road corrects the purchase to $95
  expect(short(r.store.differences)).toEqual([]);
  // fixed 2026-11-11: the BUY at $100 no longer leaves the lot the holding shows ($95), so the move saves the lot as it
  // stands ($1,900 paid, Oct 1) and says why; it had saved the BUY and listed $2,000. The value is the typed $0.
  expect(short(r.move.differences)).toEqual([]);
  expect(openPurchases(r.moveRecord, id, 'VTI').map((o) => [o.date, o.shares, o.price])).toEqual([['2026-10-01', 20, 95]]);
  expect(r.moveProblems).toEqual([expect.stringMatching(/^The activity of VTI did not leave the tax lots it shows \(20 shares\)/)]);
});

test('Options typed $0: addPosition AAPL call, 2 contracts × 100 shares at $3.50 on Sep 1 2026 → 200 shares, $700 paid', () => {
  st().addAsset({ label: 'Options', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, source: 'manual' });
  const id = idOf('Options');
  st().addPosition(id, { ticker: 'AAPL 270115C00200000', kind: 'options', multiplier: 100, lots: [{ lot_id: 'o1', shares: 2, cost_per_share: 3.5, purchase_date: '2026-09-01' }] });
  const r = bothRoads();
  expect(r.store.looked).toEqual({ accounts: 1, holdings: 1 });
  expect(r.move.looked).toEqual({ accounts: 1, holdings: 1 });
  for (const rec of [r.storeRecord, r.moveRecord]) {
    expect(openPurchases(rec, id, 'AAPL 270115C00200000').map((o) => [o.date, o.shares, o.price])).toEqual([['2026-09-01', 200, 3.5]]);
  }
  // fixed 2026-11-11: not built from its holdings, so the typed $0 is its value on both roads (the move had left it blank)
  expect(short(r.store.differences)).toEqual([]);
  expect(short(r.move.differences)).toEqual([]);
});

test('Bond typed with no market value: face $10,000, 4% coupon, matures May 15 2030, paid $9,800 → old copies balance $9,800 (value_basis paid)', () => {
  st().addAsset({ label: 'Treasury', kind: 'bond', asset_class: 'bonds', tax_bucket: 'TAXABLE', face_value: 10_000, coupon_rate: 0.04, maturity_date: '2030-05-15', amount_paid: 9_800, source: 'manual' });
  expect(st().assetAccounts[0]).toMatchObject({ balance: 9_800, value_basis: 'paid' });
  const r = bothRoads();
  expect(r.store.looked).toEqual({ accounts: 1, holdings: 0 });
  const expected: Short[] = [
    // old copies show what was paid as the value where the list leaves it blank: a balance set from what was paid is
    // not a value the account holder gave (DEC-0281); the $9,800 is kept as a fact
    ['Treasury', null, 'value', 9_800, null],
  ];
  expect(short(r.store.differences)).toEqual(expected);
  expect(short(r.move.differences)).toEqual(expected);
  for (const rec of [r.storeRecord, r.moveRecord]) expect(factsOf(rec, idOf('Treasury'), null)).toEqual({ face_value: 10_000, coupon_rate: 0.04, maturity_date: '2030-05-15', amount_paid: 9_800 });
});

test('Bond typed by face only: face $20,000, 3% coupon, matures Jan 1 2031 (value_basis face), then a market value of $19,400 as of Nov 3 2026', () => {
  st().addAsset({ label: 'Muni', kind: 'bond', asset_class: 'bonds', tax_bucket: 'TAXABLE', face_value: 20_000, coupon_rate: 0.03, maturity_date: '2031-01-01', source: 'manual' });
  expect(st().assetAccounts[0]).toMatchObject({ balance: 20_000, value_basis: 'face' });
  const r = bothRoads();
  expect(r.store.looked).toEqual({ accounts: 1, holdings: 0 });
  // old copies show the face as the value where the list leaves it blank: a face value is a fact, not a value (DEC-0281)
  expect(short(r.store.differences)).toEqual([['Muni', null, 'value', 20_000, null]]);
  expect(short(r.move.differences)).toEqual([['Muni', null, 'value', 20_000, null]]);
  st().updateAsset(idOf('Muni'), { balance: 19_400, value_as_of: '2026-11-03' });
  expect(st().assetAccounts[0].value_basis).toBeUndefined();
  const after = bothRoads();
  expect(after.store.looked).toEqual({ accounts: 1, holdings: 0 });
  expect(short(after.store.differences)).toEqual([]);
  expect(short(after.move.differences)).toEqual([]);
  expect(valuesNow(after.storeRecord, idOf('Muni'))).toMatchObject({ date: '2026-11-03', total: 19_400 });
});

test('CD at the bank typed $5,000 with no Value as of: face $5,000, 4.5%, matures Jun 1 2027, paid $5,000 → undated $5,000 and its facts', () => {
  st().addAsset({ label: 'CD', kind: 'cd', tax_bucket: 'CASH', face_value: 5_000, coupon_rate: 0.045, maturity_date: '2027-06-01', amount_paid: 5_000, cd_bought: 'bank', balance: 5_000, source: 'manual' });
  const r = bothRoads();
  expect(r.store.looked).toEqual({ accounts: 1, holdings: 0 });
  expect(short(r.store.differences)).toEqual([]);
  expect(short(r.move.differences)).toEqual([]);
  for (const rec of [r.storeRecord, r.moveRecord]) {
    expect(valuesNow(rec, idOf('CD'))).toMatchObject({ date: null, total: 5_000 });
    expect(factsOf(rec, idOf('CD'), null)).toEqual({ face_value: 5_000, coupon_rate: 0.045, maturity_date: '2027-06-01', amount_paid: 5_000, cd_bought: 'bank' });
  }
});

test('CD typed with no balance: face $5,000, paid $4,900 → old copies balance $4,900 (value_basis paid)', () => {
  st().addAsset({ label: 'CD', kind: 'cd', tax_bucket: 'CASH', face_value: 5_000, amount_paid: 4_900, source: 'manual' });
  expect(st().assetAccounts[0]).toMatchObject({ balance: 4_900, value_basis: 'paid' });
  const r = bothRoads();
  expect(r.store.looked).toEqual({ accounts: 1, holdings: 0 });
  // old copies show what was paid as the value where the list leaves it blank: paid is a fact, not a value (DEC-0281)
  expect(short(r.store.differences)).toEqual([['CD', null, 'value', 4_900, null]]);
  expect(short(r.move.differences)).toEqual([['CD', null, 'value', 4_900, null]]);
});

test('the guard looked: 22 comparisons over 14 cases, 36 account comparisons and 12 holding comparisons over both roads', () => {
  // worked by hand: the personas are 7 comparisons holding 3 accounts in all; the 13 other cases hold 1 account each,
  // two of them compared twice (after the sale was deleted; after the bond's market value) → 7 + 15 = 22 comparisons,
  // (3 + 15) accounts × 2 roads = 36; holdings: lots, handed in, buy-sell twice, edited lot, option = 6 × 2 roads = 12
  expect(total).toEqual({ cases: 22, accounts: 36, holdings: 12 });
});
