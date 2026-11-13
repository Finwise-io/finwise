/* PHASE 3, STAGE 0 — THE ROUND TRIP, ACCOUNTS TYPED BY HAND (2026-11-12).
 * The cases of compare_typed_households_2026_11_11.test.ts, run down both roads (the store's own list; the one-time move of
 * the old copies onto an empty list), and then READ OUT (asset-record-readouts.ts) beside the old copies: balance, value
 * date, cash, each holding's shares, paid and purchase dates, and the activity. Every difference is pinned with its reason.
 * The three the phase 2 comparison listed as waiting for phase 3 — Savings $1,000 + $500, Brokerage $5,000 + $12, and the
 * bonds valued at paid or face — now match. A guard must prove it looked: the last test counts what was compared. */
import { useStore, SCREENS_READ_THE_RECORD } from '../store/useStore';
// with the screens reading the record the store's copies ARE its read-outs, so the store road can differ in nothing
const onStoreRoad = (ds: unknown[]) => (SCREENS_READ_THE_RECORD ? [] : ds);
// and the move road moves the copies the screens read: with the switch those are the read-outs, which move as the old copies did
const onMoveRoad = (ds: unknown[]) => ds;
import { moveOldCopies } from '../../MoneyKeel/functions/networth-and-performance/asset-record-move';
import { readOuts, readOutDifferences, explainedDifference, type ReadOutDifference } from '../../MoneyKeel/functions/networth-and-performance/asset-record-readouts';
import { ALL_PERSONAS } from '../testing/personas';
import { isoLocalDate } from '../domain/_shared/dates';

const AT = '2026-11-11T10:00:00.000Z';
// the day the deposit is saved is the phone's day (allocateSavings dates it today), so the expected rows use it too
const TODAY = isoLocalDate(new Date());
const st = () => useStore.getState() as any;
const reset = () => useStore.setState({ assetAccounts: [], transactions: [], liabilities: [], priceCache: {}, txnFlags: [], allocatedByMonth: {},
  snaptradeConnections: [], wrapperConfirmQueue: [], assetRecord: [], assetRecordQuestions: {}, assetRecordFaults: [] } as any);
const idOf = (label: string) => String(st().assetAccounts.find((a: any) => a.label === label).asset_id);

const total = { cases: 0, accounts: 0, holdings: 0, activity: 0 };
type Short = [what: ReadOutDifference['what'], holding: string | null, old: ReadOutDifference['old'], readOut: ReadOutDifference['readOut']];
const short = (ds: ReadOutDifference[]): Short[] => ds.map((d) => [d.what, d.holding, d.old, d.readOut]);

/** Both roads, read out, beside the old copies the store holds now. */
function bothRoads() {
  const old = { assetAccounts: st().assetAccounts, transactions: st().transactions };
  const storeRead = readOuts({ assetRecord: st().assetRecord, assetAccounts: old.assetAccounts, transactions: old.transactions, priceCache: st().priceCache }, TODAY);
  const moved = moveOldCopies([], old.assetAccounts, old.transactions, AT).record;
  const moveRead = readOuts({ assetRecord: moved, assetAccounts: old.assetAccounts, transactions: old.transactions, priceCache: st().priceCache }, TODAY);
  const store = readOutDifferences(storeRead, old), move = readOutDifferences(moveRead, old);
  total.cases++;
  for (const c of [store, move]) { total.accounts += c.looked.accounts; total.holdings += c.looked.holdings; total.activity += c.looked.activity; }
  // every difference either road shows is one the read-outs explain, or it is pinned below as a fault
  const unexplained = (ds: ReadOutDifference[], record: any[]) => ds.filter((d) => explainedDifference(d, old, st().assetRecordQuestions, record) == null);
  return { store, move, storeRead, moveRead, unexplainedStore: unexplained(store.differences, st().assetRecord), unexplainedMove: unexplained(move.differences, moved) };
}

beforeEach(reset);
afterEach(() => expect(st().assetRecordFaults).toEqual([]));

test('every persona through seedNetWorth: both roads read out the old copies exactly', () => {
  const seen: Record<string, number> = {};
  for (const p of ALL_PERSONAS) {
    reset();
    st().seedNetWorth(p.op);
    const r = bothRoads();
    seen[p.name] = r.store.looked.accounts;
    expect(short(r.store.differences)).toEqual([]);
    expect(short(r.move.differences)).toEqual([]);
  }
  expect(seen).toEqual({ retiree75: 1, employedPartner: 2, studentAid: 0, hourlyServer: 0, simpleFlat: 0, twoEarnersBoth401k: 0, allSkip: 0 });
});

test('Savings $12,400 as of Sep 1 2026, and $5,000 undated: read out exactly on both roads', () => {
  st().addAsset({ label: 'Savings', institution: 'Ally', kind: 'savings', tax_bucket: 'CASH', balance: 12_400, source: 'manual', value_as_of: '2026-09-01' });
  st().addAsset({ label: 'Undated', kind: 'savings', tax_bucket: 'CASH', balance: 5_000, source: 'manual' });
  const r = bothRoads();
  expect(r.store.looked.accounts).toBe(2);
  expect(short(r.store.differences)).toEqual([]);
  expect(short(r.move.differences)).toEqual([]);
  expect(r.storeRead.assetAccounts.map((a) => [a.label, a.balance, a.value_as_of ?? null]).sort()).toEqual([['Savings', 12_400, '2026-09-01'], ['Undated', 5_000, null]]);
});

test('Savings $1,000 as of Sep 1 → $1,200 as of Oct 1 → renamed: $1,200 on Oct 1 on both roads, the new name kept from the details', () => {
  st().addAsset({ label: 'Savings', kind: 'savings', tax_bucket: 'CASH', balance: 1_000, source: 'manual', value_as_of: '2026-09-01' });
  st().updateAsset(idOf('Savings'), { balance: 1_200, value_as_of: '2026-10-01' });
  st().updateAsset(idOf('Savings'), { label: 'Ally savings' });
  const r = bothRoads();
  expect(short(r.store.differences)).toEqual([]);
  expect(short(r.move.differences)).toEqual([]);
  expect(r.storeRead.assetAccounts[0]).toMatchObject({ label: 'Ally savings', balance: 1_200, value_as_of: '2026-10-01' });
});

test('THE WORKPLAN ROW: Savings $1,000 as of Nov 1, then $500 moved in today → today’s value reads $1,500 (it read $1,000)', () => {
  st().addAsset({ label: 'Savings', kind: 'savings', tax_bucket: 'CASH', balance: 1_000, source: 'manual', value_as_of: '2026-11-01' });
  st().allocateSavings('2026-11', [{ assetId: idOf('Savings'), amount: 500 }]);
  const r = bothRoads();
  expect(r.storeRead.assetAccounts[0]).toMatchObject({ balance: 1_500, value_as_of: '2026-11-01' });
  expect(r.moveRead.assetAccounts[0]).toMatchObject({ balance: 1_500, value_as_of: '2026-11-01' });
  expect(short(r.store.differences)).toEqual(onStoreRoad([
    // explained: the old copy raised the balance and wrote no activity; the record holds the $500 as a deposit
    ['activity only in the read-out', null, null, `DEPOSIT|${idOf('Savings')}||${TODAY}|||500.00`],
  ]));
  expect(r.unexplainedStore).toEqual([]);
  // a savings account's money is its cash: the old copy opens no cash figure for it, the read-out reads the $500 into it
  expect(short(r.move.differences)).toEqual([]);
});

test('Brokerage typed $0 with VTI lots (100 at $80 Mar 3 2025, 10 at $90 undated, 5 with no cost Jun 2 2025): lots, ids and the $0 read out', () => {
  st().addAsset({ label: 'Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, source: 'manual' });
  const id = idOf('Brokerage');
  st().addPosition(id, { ticker: 'VTI', kind: 'stocks_etf', lots: [
    { lot_id: 'l1', shares: 100, cost_per_share: 80, purchase_date: '2025-03-03' },
    { lot_id: 'l2', shares: 10, cost_per_share: 90 },
    { lot_id: 'l3', shares: 5, purchase_date: '2025-06-02' },
  ] });
  const r = bothRoads();
  expect(r.store.looked).toMatchObject({ accounts: 1, holdings: 1 });
  expect(short(r.store.differences)).toEqual([]);
  expect(short(r.move.differences)).toEqual([]);
  // each lot keeps its own number (taken back out of its key on the record) — a lot edit still finds it (plan R10)
  for (const read of [r.storeRead, r.moveRead]) {
    expect(read.assetAccounts[0].positions![0].lots.map((l) => [l.lot_id, l.shares, l.cost_per_share, l.purchase_date ?? null]).sort())
      .toEqual([['l1', 100, 80, '2025-03-03'], ['l2', 10, 90, null], ['l3', 5, null, '2025-06-02']]);
    expect(read.assetAccounts[0].positions![0].position_id).toBe(st().assetAccounts[0].positions[0].position_id);
  }
});

test('Brokerage typed $0 with VTI handed in with the account: 50 at $200 on Jan 2 2024', () => {
  st().addAsset({ label: 'Imported by hand', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, source: 'manual',
    positions: [{ position_id: 'pp', ticker: 'VTI', kind: 'stocks_etf', lots: [{ lot_id: 'i1', shares: 50, cost_per_share: 200, purchase_date: '2024-01-02' }] }] });
  const r = bothRoads();
  expect(short(r.store.differences)).toEqual([]);
  expect(short(r.move.differences)).toEqual([]);
});

test('Brokerage typed $5,000: BUY 20 VTI at $100 Oct 1, SELL 5 at $120 Oct 15, DIVIDEND $12 Oct 20 → $5,012 read out (it read $5,000); the sale deleted → 20', () => {
  st().addAsset({ label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 5_000, source: 'manual' });
  const id = idOf('Brokerage');
  st().recordTransaction({ type: 'BUY', account_id: id, ticker: 'VTI', shares: 20, price: 100, date: '2026-10-01' });
  st().recordTransaction({ type: 'SELL', account_id: id, ticker: 'VTI', shares: 5, price: 120, date: '2026-10-15' });
  st().recordTransaction({ type: 'DIVIDEND', account_id: id, ticker: 'VTI', amount: 12, date: '2026-10-20' });
  const r = bothRoads();
  // the $12 dividend recorded after the undated $5,000 is added; the cash it opened is marked not entered, as the old copy
  for (const read of [r.storeRead, r.moveRead]) expect(read.assetAccounts[0]).toMatchObject({ balance: 5_012, cash_balance: 12, cash_not_entered: true });
  expect(short(r.store.differences)).toEqual([]);
  expect(short(r.move.differences)).toEqual(onMoveRoad([
    // explained (DEC-10749): the move saves the 15 VTI held today as one tax lot, and the 5 sold as a purchase behind the
    // sale; it never saves the BUY of 20 the lot came from
    ['activity only in the old copy', 'VTI', `BUY|${id}|VTI|2026-10-01|20.000000|100.000000|`, null],
    ['activity only in the read-out', 'VTI', null, `OPENING_POSITION|${id}|VTI|2026-10-01|15.000000|100.000000|`],
  ]));
  expect(r.unexplainedMove).toEqual([]);
  // the activity reads back with its own ids (taken back out of their keys)
  expect(r.storeRead.transactions.map((t) => t.id).sort()).toEqual(st().transactions.map((t: any) => t.id).sort());
  expect(st().deleteTransaction(st().transactions.find((t: any) => t.type === 'SELL').id)).toBe(true);
  const after = bothRoads();
  expect(after.storeRead.assetAccounts[0].positions![0].lots.reduce((n, l) => n + l.shares, 0)).toBe(20);
  expect(short(after.store.differences)).toEqual([]);
  expect(after.unexplainedMove).toEqual([]);
});

test('Brokerage typed $0: BUY 20 VTI at $100 Oct 1, the lot then edited to $95 → $1,900 paid read out', () => {
  st().addAsset({ label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, source: 'manual' });
  const id = idOf('Brokerage');
  st().recordTransaction({ type: 'BUY', account_id: id, ticker: 'VTI', shares: 20, price: 100, date: '2026-10-01' });
  const p = st().assetAccounts[0].positions[0];
  st().updatePosition(id, p.position_id, { lots: [{ ...p.lots[0], cost_per_share: 95 }] });
  const r = bothRoads();
  expect(short(r.store.differences)).toEqual(onStoreRoad([
    // the old activity record keeps the BUY at $100 (the lot edit does not rewrite a BUY); the record's purchase line is
    // the account holder's correction to $95 — the activity tells the same purchase at the price the account holder gave
    ['activity only in the old copy', 'VTI', `BUY|${id}|VTI|2026-10-01|20.000000|100.000000|`, null],
    ['activity only in the read-out', 'VTI', null, `BUY|${id}|VTI|2026-10-01|20.000000|95.000000|`],
  ]));
  // with the switch the activity the screens read is the read-out: the BUY at the $95 the account holder gave
  if (SCREENS_READ_THE_RECORD) expect(st().transactions.filter((t: any) => t.type === 'BUY').map((t: any) => [t.shares, t.price])).toEqual([[20, 95]]);
  expect(short(r.move.differences)).toEqual(onMoveRoad([
    // the move saves the lot as held today, at the $95 the account holder gave (DEC-10749); with the switch the copy moved
    // already shows the BUY at the $95 he corrected it to
    ['activity only in the old copy', 'VTI', `BUY|${id}|VTI|2026-10-01|20.000000|${SCREENS_READ_THE_RECORD ? '95' : '100'}.000000|`, null],
    ['activity only in the read-out', 'VTI', null, `OPENING_POSITION|${id}|VTI|2026-10-01|20.000000|95.000000|`],
  ]));
  expect(r.storeRead.assetAccounts[0].positions![0].lots[0]).toMatchObject({ shares: 20, cost_per_share: 95, purchase_date: '2026-10-01' });
  expect([r.unexplainedStore, r.unexplainedMove]).toEqual([[], []]);
});

test('Options typed $0: 2 AAPL call contracts × 100 at $3.50 on Sep 1 2026 → read out as 2 contracts (the record holds 200 shares)', () => {
  st().addAsset({ label: 'Options', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 0, source: 'manual' });
  const id = idOf('Options');
  st().addPosition(id, { ticker: 'AAPL 270115C00200000', kind: 'options', multiplier: 100, lots: [{ lot_id: 'o1', shares: 2, cost_per_share: 3.5, purchase_date: '2026-09-01' }] });
  const r = bothRoads();
  expect(short(r.store.differences)).toEqual([]);
  expect(short(r.move.differences)).toEqual([]);
  for (const read of [r.storeRead, r.moveRead]) expect(read.assetAccounts[0].positions![0].lots).toEqual([{ lot_id: 'o1', shares: 2, cost_per_share: 3.5, purchase_date: '2026-09-01' }]);
});

test('BONDS (DEC-0281): Treasury paid $9,800 → $9,800 paid; Muni face $20,000 → $20,000 face, then $19,400 as of Nov 3; CD $5,000 typed; CD paid $4,900', () => {
  st().addAsset({ label: 'Treasury', kind: 'bond', asset_class: 'bonds', tax_bucket: 'TAXABLE', face_value: 10_000, coupon_rate: 0.04, maturity_date: '2030-05-15', amount_paid: 9_800, source: 'manual' });
  st().addAsset({ label: 'Muni', kind: 'bond', asset_class: 'bonds', tax_bucket: 'TAXABLE', face_value: 20_000, coupon_rate: 0.03, maturity_date: '2031-01-01', source: 'manual' });
  st().addAsset({ label: 'CD', kind: 'cd', tax_bucket: 'CASH', face_value: 5_000, coupon_rate: 0.045, maturity_date: '2027-06-01', amount_paid: 5_000, cd_bought: 'bank', balance: 5_000, source: 'manual' });
  st().addAsset({ label: 'CD paid', kind: 'cd', tax_bucket: 'CASH', face_value: 5_000, amount_paid: 4_900, source: 'manual' });
  const r = bothRoads();
  expect(r.store.looked.accounts).toBe(4);
  // phase 2 listed three of these as "old copies show paid or face, the list blank": the read-out keeps today's value
  expect(short(r.store.differences)).toEqual([]);
  expect(short(r.move.differences)).toEqual([]);
  for (const read of [r.storeRead, r.moveRead]) {
    expect(read.assetAccounts.map((a) => [a.label, a.balance, a.value_basis ?? null]).sort()).toEqual([
      ['CD paid', 4_900, 'paid'], ['CD', 5_000, null], ['Muni', 20_000, 'face'], ['Treasury', 9_800, 'paid']]);
    expect(read.assetAccounts.find((a) => a.label === 'Treasury')).toMatchObject({ face_value: 10_000, coupon_rate: 0.04, maturity_date: '2030-05-15', amount_paid: 9_800 });
  }
  st().updateAsset(idOf('Muni'), { balance: 19_400, value_as_of: '2026-11-03' });
  const after = bothRoads();
  expect(short(after.store.differences)).toEqual([]);
  expect(short(after.move.differences)).toEqual([]);
  const muni = after.storeRead.assetAccounts.find((a) => a.label === 'Muni')!;
  expect(muni).toMatchObject({ balance: 19_400, value_as_of: '2026-11-03' });
  expect(muni.value_basis).toBeUndefined();
});

test('the guard looked: 18 comparisons, 42 account and 12 holding comparisons over both roads, and the activity', () => {
  // by hand: personas 7 comparisons (3 accounts); savings pair 1 (2); rename 1; $1,500 1; lots 1; handed in 1; buy-sell 2;
  // edited lot 1; option 1; bonds 2 (4 accounts each) → 18 comparisons; accounts (3+2+1+1+1+1+2+1+1+8) × 2 roads = 42;
  // holdings: lots, handed in, buy-sell twice, edited lot, option = 6 × 2 roads = 12
  expect(total.cases).toBe(18);
  expect(total.accounts).toBe(42);
  expect(total.holdings).toBe(12);
  expect(total.activity).toBeGreaterThanOrEqual(10);
});
