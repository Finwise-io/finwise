/* PHASE 3, STAGE 0 — THE ROUND TRIP, LINKED BROKER ACCOUNTS (2026-11-12).
 * The cases of compare_linked_broker_2026_11_11.test.ts: the REAL sync (runSnapTradeSync → ingestSnapTradeSync) with only the
 * broker's answers mocked, then the master record READ OUT (asset-record-readouts.ts) beside the old copies: balance, value
 * date, cash, each holding's shares, paid and purchase dates, and the activity. Every difference is pinned with its reason;
 * the only ones are the two the phase 2 comparison listed (the value date; a typed purchase date the old copy wiped). */
import { runSnapTradeSync, SIGNS_REFETCH, refetchMarkKey } from './snaptradeSync';
import { useStore, SCREENS_READ_THE_RECORD } from '../../store/useStore';

// THE SWITCH (2026-11-13): once the screens read the record, the copies they read ARE the read-outs, so the old copies and
// the record no longer differ — the differences these checks found while the old copies stood are none
const whileOld = <T,>(d: T[]): T[] => (SCREENS_READ_THE_RECORD ? [] : d);
import { readOuts, readOutDifferences, explainedDifference, type ReadOutDifference } from '../../../MoneyKeel/functions/networth-and-performance/asset-record-readouts';

const broker: { accounts: any[]; holdings: Record<string, any>; activities: Record<string, any[]> } = { accounts: [], holdings: {}, activities: {} };
(global as any).__readoutBroker = broker;
jest.mock('./snaptradeClient', () => ({
  snaptradeConfigured: () => true,
  usdCash: (b: any[]) => (b ?? []).reduce((t: number, x: any) => t + (x.cash ?? 0), 0),
  snaptradeApi: {
    connections: jest.fn(async () => [{ id: 'conn-1', disabled: false, brokerage: { name: 'Robinhood' } }]),
    accounts: jest.fn(async () => (global as any).__readoutBroker.accounts),
    holdings: jest.fn(async (id: string) => (global as any).__readoutBroker.holdings[id]),
    activities: jest.fn(async (id: string) => ({ activities: (global as any).__readoutBroker.activities[id] ?? [] })),
  },
}));

const msft = { id: 'u-msft', raw_symbol: 'MSFT', description: 'Microsoft Corp', type: { code: 'cs' } };
const account = (total: number, listDay: string) => ({
  id: 'acc-1', brokerage_authorization: 'conn-1', name: 'Robinhood Individual', number: '998877665', institution_name: 'Robinhood', raw_type: 'Individual',
  balance: { total: { amount: total, currency: 'USD' } },
  sync_status: { holdings: { initial_sync_completed: true, last_successful_sync: `${listDay}T20:30:00Z` } },
});
const lot = (shares: number) => ({ original_purchase_date: '2026-07-30T00:00:00Z', quantity: shares, purchased_price: 350 });
const position = (shares: number, price: number, withLots = true) => ({ symbol: msft, units: shares, price, average_purchase_price: 350, ...(withLots ? { tax_lots: [lot(shares)] } : {}) });
const holdings = (pos: any) => ({ positions: [pos], optionPositions: [], balances: [{ cash: 0 }] });
const BUY = { id: 'a-buy-1', type: 'BUY', trade_date: '2026-07-30', settlement_date: '2026-07-31', units: 500, price: 350, amount: -175000, fee: 0, symbol: msft };
const SELL = { id: 'a-sell-1', type: 'SELL', trade_date: '2026-10-01', settlement_date: '2026-10-02', units: -200, price: 460, amount: 92000, fee: 0, symbol: msft };
function septemberUpdate(history: any[] | null, withLots = true) {
  broker.accounts = [account(225000, '2026-09-15')];
  broker.holdings = { 'acc-1': holdings(position(500, 450, withLots)) };
  broker.activities = { 'acc-1': history ?? [] };
}

const looked = { cases: 0, accounts: 0, holdings: 0 };
type Short = [what: ReadOutDifference['what'], holding: string | null, old: ReadOutDifference['old'], readOut: ReadOutDifference['readOut']];
/** The store's old copies beside its record read out; every difference explained or pinned. */
function roundTrip() {
  const s = useStore.getState() as any;
  const old = { assetAccounts: s.assetAccounts, transactions: s.transactions };
  const read = readOuts(s, new Date().toISOString().slice(0, 10));
  const c = readOutDifferences(read, old);
  expect(c.looked.accounts).toBeGreaterThanOrEqual(1);
  expect(c.looked.holdings).toBeGreaterThanOrEqual(1);
  looked.cases++; looked.accounts += c.looked.accounts; looked.holdings += c.looked.holdings;
  const short: Short[] = c.differences.map((d) => [d.what, d.holding, d.old, d.readOut]);
  return { read, short, unexplained: c.differences.filter((d) => explainedDifference(d, old, s.assetRecordQuestions, s.assetRecord) == null), syncDay: new Date().toISOString().slice(0, 10) };
}

beforeEach(() => { useStore.getState().resetAll(); jest.clearAllMocks(); });

const oldDay = () => (useStore.getState() as any).assetAccounts[0].value_as_of;

test('(1) the Sept 15 update: 500 MSFT bought Jul 30 at $350, worth $225,000 → read out exactly but the value date', async () => {
  septemberUpdate([BUY]);
  expect(await runSnapTradeSync({ force: true })).toBe(1);
  const was = oldDay();
  const r = roundTrip();
  // explained: the old copy dates the value by the sync day; the record by the broker's own update of Sept 15 (his ruling)
  expect(r.short).toEqual(whileOld([['value date', null, was, '2026-09-15']]));
  expect(r.unexplained).toEqual([]);
  expect(r.read.assetAccounts[0]).toMatchObject({ balance: 225_000, cash_balance: 0, value_as_of: '2026-09-15', label: 'Robinhood Individual', source: 'connected' });
  // the tax lot keeps the old copy's own number (matched by its date, shares and price), so a route to it still finds it
  const oldLot = (useStore.getState() as any).assetAccounts[0].positions[0].lots[0];
  expect(r.read.assetAccounts[0].positions![0].lots).toEqual([oldLot]);
  expect(r.read.transactions.map((t) => [t.type, t.date, t.shares, t.price, t.source])).toEqual([['BUY', '2026-07-30', 500, 350, 'connected']]);
});

test('(2) then the Oct 15 update with a sale of 200 on Oct 1 at $460: 300 left at $470 = $141,000 → read out exactly but the value date', async () => {
  septemberUpdate([BUY]);
  await runSnapTradeSync({ force: true });
  broker.accounts = [account(141000, '2026-10-15')];
  broker.holdings = { 'acc-1': holdings(position(300, 470)) };
  broker.activities = { 'acc-1': [BUY, SELL] };
  expect(await runSnapTradeSync({ force: true })).toBe(1);
  const was = oldDay();
  const r = roundTrip();
  expect(r.short).toEqual(whileOld([['value date', null, was, '2026-10-15']]));
  expect(r.unexplained).toEqual([]);
  // the SELL dated Oct 1 is before the Oct 15 value, so it is not added again: $141,000, the broker's own total
  expect(r.read.assetAccounts[0]).toMatchObject({ balance: 141_000, value_as_of: '2026-10-15' });
  // the lot keeps the old copy's own spelling of its day (the broker's time-stamp), as the details wrote it
  expect(r.read.assetAccounts[0].positions![0].lots.map((l) => [l.shares, l.cost_per_share, l.purchase_date])).toEqual([[300, 350, '2026-07-30T00:00:00Z']]);
});

test('(3) a broker sending only an average price: 500 MSFT at $350, no date → the lot reads back undated, never the sync day', async () => {
  septemberUpdate(null, false);
  expect(await runSnapTradeSync({ force: true })).toBe(1);
  const was = oldDay();
  const r = roundTrip();
  expect(r.short).toEqual(whileOld([['value date', null, was, '2026-09-15']]));
  expect(r.unexplained).toEqual([]);
  expect(r.read.assetAccounts[0].positions![0].lots.map((l) => [l.shares, l.cost_per_share, l.purchase_date || null])).toEqual([[500, 350, null]]);
});

test('(4) tax lots but no history: one lot of 500 MSFT bought Jul 30 at $350 → read out exactly but the value date', async () => {
  septemberUpdate([]);
  expect(await runSnapTradeSync({ force: true })).toBe(1);
  const was = oldDay();
  const r = roundTrip();
  expect(r.short).toEqual(whileOld([['value date', null, was, '2026-09-15']]));
  expect(r.unexplained).toEqual([]);
});

test('(5) typed 500 MSFT bought Jul 28, then linked; the broker says Jul 30 — the typed date reads out, and is asked', async () => {
  useStore.getState().addAsset({ label: 'My Robinhood', institution: 'Robinhood', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 175000, target_return: 0.08,
    source: 'manual', value_as_of: '2026-08-01',
    positions: [{ position_id: 'p1', ticker: 'MSFT', kind: 'stocks_etf', lots: [{ lot_id: 'l1', shares: 500, cost_per_share: 350, purchase_date: '2026-07-28' }] }] } as any);
  const before = roundTrip();
  expect(before.short).toEqual([]);
  septemberUpdate([BUY]);
  expect(await runSnapTradeSync({ force: true })).toBe(1);
  const id = (useStore.getState() as any).assetAccounts[0].asset_id;
  const was = oldDay();
  const r = roundTrip();
  expect(r.short).toEqual(whileOld([
    ['value date', null, was, '2026-09-15'],
    // explained: the old copy WIPED the typed Jul 28 with the broker's Jul 30; the record keeps Jul 28 and asks
    ['purchase dates', 'MSFT', '2026-07-30', '2026-07-28'],
    // explained: the broker's buy of Jul 30 is that same question, saved only once the account holder answers
    ['activity only in the old copy', 'MSFT', `BUY|${id}|MSFT|2026-07-30|500.000000|350.000000|`, null],
  ]));
  expect(r.unexplained).toEqual([]);
  expect(r.read.assetAccounts.map((a) => a.asset_id)).toEqual([id]);
  expect(r.read.assetAccounts[0].balance).toBe(225_000);
});

test('(6) a phone that synced before today, its record empty: the next sync reads the whole history once → read out exactly but the value date', async () => {
  septemberUpdate([BUY]);
  await runSnapTradeSync({ force: true });
  useStore.setState({ assetRecord: [], assetRecordQuestions: {}, snaptradeActivityCursor: { 'acc-1': '2026-09-15T00:00:00.000Z', [refetchMarkKey('acc-1')]: SIGNS_REFETCH } } as any);
  // before the sync the record holds nothing for the account: it reads out exactly as its details stand (plan R2)
  const waiting = roundTrip();
  expect(waiting.short).toEqual([]);
  expect(await runSnapTradeSync({ force: true })).toBe(1);
  const was = oldDay();
  const r = roundTrip();
  expect(r.short).toEqual(whileOld([['value date', null, was, '2026-09-15']]));
  expect(r.unexplained).toEqual([]);
});

test('the guard looked: 8 round trips, 8 accounts and 8 holdings compared', () => {
  expect(looked).toEqual({ cases: 8, accounts: 8, holdings: 8 });
});
