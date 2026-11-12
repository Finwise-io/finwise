/* PHASE 2, STEP 7 — THE COMPARISON CHECK, LINKED BROKER ACCOUNTS (2026-11-11).
 * Each case runs the REAL sync (runSnapTradeSync → the store's ingestSnapTradeSync → ingest.ts + asset-record-from-broker.ts)
 * with only the broker's answers mocked, then sets the master record's answer (assetRecord) beside the old copies
 * (assetAccounts) with compareRecordToOldCopies. Every difference is listed EXACTLY, with what explains it; a difference
 * where the list is wrong would carry a comment starting FAULT:. Every check asserts how many accounts and holdings it
 * looked at, so a check that compared nothing cannot pass as clean. */
import { runSnapTradeSync, SIGNS_REFETCH, refetchMarkKey } from './snaptradeSync';
import { useStore } from '../../store/useStore';
import { compareRecordToOldCopies, type Difference } from '../../testing/compareRecordToOldCopies';
import { openPurchases, rowsInForce } from '../../../MoneyKeel/functions/networth-and-performance/asset-record';

// What the broker answers in the test that is running. The mock reads it at call time.
const broker: { accounts: any[]; holdings: Record<string, any>; activities: Record<string, any[]> } = { accounts: [], holdings: {}, activities: {} };
(global as any).__compareBroker = broker;
jest.mock('./snaptradeClient', () => ({
  snaptradeConfigured: () => true,
  usdCash: (b: any[]) => (b ?? []).reduce((t: number, x: any) => t + (x.cash ?? 0), 0),
  snaptradeApi: {
    connections: jest.fn(async () => [{ id: 'conn-1', disabled: false, brokerage: { name: 'Robinhood' } }]),
    accounts: jest.fn(async () => (global as any).__compareBroker.accounts),
    holdings: jest.fn(async (id: string) => (global as any).__compareBroker.holdings[id]),
    activities: jest.fn(async (id: string) => ({ activities: (global as any).__compareBroker.activities[id] ?? [] })),
  },
}));
const api = jest.requireMock('./snaptradeClient').snaptradeApi;

// The broker shapes of asset-record-from-broker.test.ts case (a): 500 MSFT bought Jul 30 at $350, settled Jul 31.
const msft = { id: 'u-msft', raw_symbol: 'MSFT', description: 'Microsoft Corp', type: { code: 'cs' } };
/** The broker's account, with its own total and its own last update of the holdings (the day of the list). */
const account = (total: number, listDay: string) => ({
  id: 'acc-1', brokerage_authorization: 'conn-1', name: 'Robinhood Individual', number: '998877665', institution_name: 'Robinhood', raw_type: 'Individual',
  balance: { total: { amount: total, currency: 'USD' } },
  sync_status: { holdings: { initial_sync_completed: true, last_successful_sync: `${listDay}T20:30:00Z` /* 4:30 pm New York: the same day in every United States time zone and in UTC */ } },
});
const lot = (shares: number) => ({ original_purchase_date: '2026-07-30T00:00:00Z', quantity: shares, purchased_price: 350 });
const position = (shares: number, price: number, withLots = true) =>
  ({ symbol: msft, units: shares, price, average_purchase_price: 350, ...(withLots ? { tax_lots: [lot(shares)] } : {}) });
const holdings = (pos: any) => ({ positions: [pos], optionPositions: [], balances: [{ cash: 0 }] });
const BUY = { id: 'a-buy-1', type: 'BUY', trade_date: '2026-07-30', settlement_date: '2026-07-31', units: 500, price: 350, amount: -175000, fee: 0, symbol: msft };
const SELL = { id: 'a-sell-1', type: 'SELL', trade_date: '2026-10-01', settlement_date: '2026-10-02', units: -200, price: 460, amount: 92000, fee: 0, symbol: msft };

/** The broker's update of Sept 15: 500 MSFT at $450 = $225,000, its tax lot, and (where given) its history. */
function septemberUpdate(history: any[] | null, withLots = true) {
  broker.accounts = [account(225000, '2026-09-15')];
  broker.holdings = { 'acc-1': holdings(position(500, 450, withLots)) };
  broker.activities = { 'acc-1': history ?? [] };
}

/** Both answers for every account on the phone, and the day the sync ran (the old copies date the value by it). */
function compare() {
  const s = useStore.getState() as any;
  const c = compareRecordToOldCopies(s.assetRecord ?? [], s.assetAccounts ?? []);
  // a guard must prove it looked
  expect(c.looked.accounts).toBeGreaterThanOrEqual(1);
  expect(c.looked.holdings).toBeGreaterThanOrEqual(1);
  return { ...c, s, syncDay: new Date().toISOString().slice(0, 10) };
}
const d = (accountId: string, label: string, holding: string | null, what: Difference['what'], old: any, list: any): Difference => ({ accountId, label, holding, what, old, list });
const LABEL = 'Robinhood Individual';

beforeEach(() => { useStore.getState().resetAll(); jest.clearAllMocks(); });

test('(1) nothing held, then the Sept 15 update: 500 MSFT bought Jul 30 at $350 (settled Jul 31), one tax lot + one history purchase, worth $225,000 at $450', async () => {
  septemberUpdate([BUY]);
  expect(await runSnapTradeSync({ force: true })).toBe(1);
  expect(api.activities).toHaveBeenCalledTimes(1);
  const c = compare();
  expect(c.looked).toEqual({ accounts: 1, holdings: 1 });
  // one tax lot and one history purchase on the same date are ONE purchase: 500 shares at $350, not 1,000
  expect(openPurchases(c.s.assetRecord, 'st-acc-1', 'MSFT').map((o) => [o.date, o.shares, o.price])).toEqual([['2026-07-30', 500, 350]]);
  expect(c.s.assetRecordQuestions['st-acc-1']).toMatchObject({ events: [], lists: [] });
  expect(c.differences).toEqual([
    // the old copy dates the value by the sync day; the list by the broker's own update of Sept 15 (his ruling)
    d('st-acc-1', LABEL, null, 'value date', c.syncDay, '2026-09-15'),
  ]);
  // shares (500), paid ($175,000), purchase date (Jul 30, compared by day) and value ($225,000) agree: no row for them above
});

test('(2) 500 MSFT from the Sept 15 update, then the Oct 15 update with a sale of 200 on Oct 1 at $460: 300 left at $470 = $141,000', async () => {
  septemberUpdate([BUY]);
  await runSnapTradeSync({ force: true });
  broker.accounts = [account(141000, '2026-10-15')];
  broker.holdings = { 'acc-1': holdings(position(300, 470)) };
  broker.activities = { 'acc-1': [BUY, SELL] };
  expect(await runSnapTradeSync({ force: true })).toBe(1);
  const c = compare();
  expect(c.looked).toEqual({ accounts: 1, holdings: 1 });
  // the shares changed only on the sale: 500 − 200 = 300 left of the Jul 30 purchase, still at $350
  expect(openPurchases(c.s.assetRecord, 'st-acc-1', 'MSFT').map((o) => [o.date, o.shares, o.price])).toEqual([['2026-07-30', 300, 350]]);
  expect(rowsInForce(c.s.assetRecord).filter((r) => r.kind === 'SALE').map((r) => [r.date, r.shares, r.price])).toEqual([['2026-10-01', 200, 460]]);
  expect(c.s.assetRecordQuestions['st-acc-1']).toMatchObject({ events: [], lists: [] });
  expect(c.differences).toEqual([
    // the old copy dates the value by the sync day; the list by the broker's own update of Oct 15
    d('st-acc-1', LABEL, null, 'value date', c.syncDay, '2026-10-15'),
  ]);
  // shares (300), paid (300 × $350 = $105,000) and value ($141,000) agree
});

test('(3) nothing held, then a broker sending only an average price: 500 MSFT at an average of $350, no tax lots, no history, worth $225,000', async () => {
  septemberUpdate(null, false);
  expect(await runSnapTradeSync({ force: true })).toBe(1);
  const c = compare();
  expect(c.looked).toEqual({ accounts: 1, holdings: 1 });
  // one line at the average, with no date — never the sync day, never $0
  expect(openPurchases(c.s.assetRecord, 'st-acc-1', 'MSFT').map((o) => [o.date, o.shares, o.price])).toEqual([[null, 500, 350]]);
  expect(c.differences).toEqual([
    // the old copy dates the value by the sync day; the list by the broker's own update of Sept 15
    d('st-acc-1', LABEL, null, 'value date', c.syncDay, '2026-09-15'),
  ]);
});

test('(4) nothing held, then a broker with tax lots but no history: one tax lot of 500 MSFT bought Jul 30 at $350, worth $225,000', async () => {
  septemberUpdate([]);
  expect(await runSnapTradeSync({ force: true })).toBe(1);
  const c = compare();
  expect(c.looked).toEqual({ accounts: 1, holdings: 1 });
  // the broker's tax lot says what is held and what was paid
  expect(openPurchases(c.s.assetRecord, 'st-acc-1', 'MSFT').map((o) => [o.date, o.shares, o.price])).toEqual([['2026-07-30', 500, 350]]);
  expect(c.differences).toEqual([
    // the old copy dates the value by the sync day; the list by the broker's own update of Sept 15
    d('st-acc-1', LABEL, null, 'value date', c.syncDay, '2026-09-15'),
  ]);
});

test('(5) typed by hand: 500 MSFT bought Jul 28 at $350 at Robinhood, then linked; the broker says Jul 30 — the typed date stays and is asked', async () => {
  useStore.getState().addAsset({ label: 'My Robinhood', institution: 'Robinhood', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 175000, target_return: 0.08,
    source: 'manual', value_as_of: '2026-08-01',
    positions: [{ position_id: 'p1', ticker: 'MSFT', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 500, cost_per_share: 350, purchase_date: '2026-07-28' }] }] } as any);
  const id = (useStore.getState() as any).assetAccounts[0].asset_id as string;

  // BEFORE THE LINK
  const before = compare();
  expect(before.looked).toEqual({ accounts: 1, holdings: 1 });
  // the typed $175,000 as of Aug 1 is on the list too (the account is not built from its holdings): nothing differs.
  // Until 2026-11-11 the list dropped that typed total — a fault, now fixed in asset-record-from-typed.ts.
  expect(before.differences).toEqual([]);

  // THE LINK: the sync absorbs the typed twin (same institution, same tax bucket) — same account, no second one
  septemberUpdate([BUY]);
  expect(await runSnapTradeSync({ force: true })).toBe(1);
  const c = compare();
  expect(c.s.assetAccounts.map((a: any) => a.asset_id)).toEqual([id]);
  expect(c.looked).toEqual({ accounts: 1, holdings: 1 });
  // the list keeps the typed purchase — still Jul 28, still 500, not 1,000 — and the broker's Jul 30 is ASKED, nothing changed until answered
  expect(openPurchases(c.s.assetRecord, id, 'MSFT').map((o) => [o.date, o.shares, o.price])).toEqual([['2026-07-28', 500, 350]]);
  const asked = c.s.assetRecordQuestions[id].events;
  expect(asked.map((q: any) => [q.why, q.onRecord.source, q.onRecord.date, q.arriving.source, q.arriving.date])).toEqual([['date', 'typed', '2026-07-28', 'linked', '2026-07-30']]);
  expect(c.differences).toEqual([
    // the old copy WIPED the typed Jul 28 with the broker's Jul 30 (the fault his ruling fixes: a broker update never wipes
    // a purchase date the account holder typed); the list keeps Jul 28 and asks
    d(id, LABEL, 'MSFT', 'purchase dates', '2026-07-30', '2026-07-28'),
    // the old copy dates the value by the sync day; the list by the broker's own update of Sept 15
    d(id, LABEL, null, 'value date', c.syncDay, '2026-09-15'),
  ]);
  // the value now agrees: $225,000 from the broker on both sides
});

test('(6) a phone that synced before today: old copies hold 500 MSFT with its history and cursor, the record is empty — the next sync reads the whole history once', async () => {
  septemberUpdate([BUY]);
  await runSnapTradeSync({ force: true });
  const txBefore = (useStore.getState() as any).transactions.length;
  expect(txBefore).toBeGreaterThanOrEqual(1);

  // CONTROL: with the record holding the broker's rows, the cursor is honoured (cursor − 7 days)
  useStore.setState({ snaptradeActivityCursor: { 'acc-1': '2026-09-15T00:00:00.000Z', [refetchMarkKey('acc-1')]: SIGNS_REFETCH } } as any);
  jest.clearAllMocks();
  await runSnapTradeSync({ force: true });
  expect(api.activities.mock.calls.find((x: any[]) => x[0] === 'acc-1')?.[1]?.startDate).toBe('2026-09-08');

  // THE PHONE OF BEFORE TODAY: the same old copies and cursor, the master record empty
  useStore.setState({ assetRecord: [], assetRecordQuestions: {}, snaptradeActivityCursor: { 'acc-1': '2026-09-15T00:00:00.000Z', [refetchMarkKey('acc-1')]: SIGNS_REFETCH } } as any);
  jest.clearAllMocks();
  expect(await runSnapTradeSync({ force: true })).toBe(1);
  const calls = api.activities.mock.calls.filter((x: any[]) => x[0] === 'acc-1');
  expect(calls).toHaveLength(1);
  expect(calls[0][1].startDate).toBeUndefined();               // no start date: the whole history, once
  const c = compare();
  expect((useStore.getState() as any).transactions.length).toBe(txBefore);   // the re-read adds nothing twice to the old copies
  // the broker's history buy of Jul 30 is on the record (keyed by what it says, not the broker's id, which can change);
  // that it is held once is the open-purchases line below
  expect(c.s.assetRecord.some((r: any) => r.source === 'linked' && r.kind === 'PURCHASE' && r.date === '2026-07-30' && r.shares === 500 && r.ref != null)).toBe(true);
  expect(c.looked).toEqual({ accounts: 1, holdings: 1 });
  expect(openPurchases(c.s.assetRecord, 'st-acc-1', 'MSFT').map((o) => [o.date, o.shares, o.price])).toEqual([['2026-07-30', 500, 350]]);
  expect(c.differences).toEqual([
    // the old copy dates the value by the sync day; the list by the broker's own update of Sept 15
    d('st-acc-1', LABEL, null, 'value date', c.syncDay, '2026-09-15'),
  ]);
});
