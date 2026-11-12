// One broker update, read into the one master record (asset-record-from-broker.ts), then run through the record's
// own calling order: sortArriving → addRows; purchasesFromList → addRows; valueRows → addRows.
import { brokerUpdateToRecord } from './asset-record-from-broker';
import {
  addRows, sortArriving, purchasesFromList, sharesOnRecord, valuesNow, type AssetRow,
} from './asset-record';
import type { AccountSyncPayload } from '../../../src/services/sync/ingest';
import type { StAccount } from '../../../src/services/sync/snaptrade';

// the phone's date — a different day from every broker date below
const NOW = '2026-11-11T09:30:00.000Z';
const ACC = 'st-acc-1';
const acct = (over: Partial<StAccount> = {}): StAccount => ({
  id: 'acc-1', brokerage_authorization: 'conn-1', name: 'Robinhood Individual',
  number: '998877665', institution_name: 'Robinhood', raw_type: 'Individual',
  balance: { total: { amount: 225000, currency: 'USD' } },
  sync_status: { holdings: { initial_sync_completed: true, last_successful_sync: '2026-09-15T06:00:00Z' } },
  ...over,
});
const msft = { id: 'u-msft', raw_symbol: 'MSFT', description: 'Microsoft Corp', type: { code: 'cs' } } as any;
const payload = (over: Partial<AccountSyncPayload> = {}): AccountSyncPayload => ({
  account: acct(), balancesCash: 0,
  positions: [{ symbol: msft, units: 500, price: 450, average_purchase_price: 350,
    tax_lots: [{ original_purchase_date: '2026-07-30T00:00:00Z', quantity: 500, purchased_price: 350 }] }],
  activities: [{ id: 'a-buy-1', type: 'BUY', trade_date: '2026-07-30', settlement_date: '2026-07-31', units: 500, price: 350, amount: -175000, fee: 0, symbol: msft }],
  ...over,
});

/** The full calling order, as the app will run it for one update. */
function runUpdate(record: AssetRow[], p: AccountSyncPayload, at: string): AssetRow[] {
  const u = brokerUpdateToRecord(record, p, ACC);
  const sorted = sortArriving(record, u.events);
  let rec = addRows(record, sorted.save, at);
  for (const l of u.lists) rec = addRows(rec, purchasesFromList(rec, ACC, l.holding, l.listed, 'linked', u.listDay, sorted.ask).rows, at);
  return addRows(rec, u.values, at);
}

describe('one broker update into the one master record', () => {
  test('(a) his Microsoft case: 500 MSFT bought Jul 30 at $350, the update of Sept 15 at $450', () => {
    const u = brokerUpdateToRecord([], payload(), ACC);
    expect(u.listDay).toBe('2026-09-15');
    expect(u.events).toHaveLength(1);
    expect(u.events[0]).toMatchObject({ kind: 'PURCHASE', holding: 'MSFT', date: '2026-07-30', settlementDate: '2026-07-31', shares: 500, price: 350,
      amount: 175000, fee: 0, source: 'linked', ref: 'a-buy-1' });
    expect(u.lists).toEqual([{ holding: 'MSFT', listed: [{ date: '2026-07-30', shares: 500, price: 350 }] }]);
    expect(u.values.map((v) => [v.holding, v.date, v.amount])).toEqual([[null, '2026-09-15', 0], ['MSFT', '2026-09-15', 225000]]);
    expect(u.values[0].statedTotal).toBe(225000);

    const rec = runUpdate([], payload(), NOW);
    expect(sharesOnRecord(rec, ACC, 'MSFT')).toBe(500);
    const now = valuesNow(rec, ACC)!;
    expect(now.date).toBe('2026-09-15');
    expect(now.total).toBe(225000);
  });

  test('(b) the same update arriving twice adds nothing', () => {
    const once = runUpdate([], payload(), NOW);
    const twice = runUpdate(once, payload(), '2026-11-12T09:30:00.000Z');
    expect(twice).toHaveLength(once.length);
    expect(sharesOnRecord(twice, ACC, 'MSFT')).toBe(500);
    const again = brokerUpdateToRecord(once, payload(), ACC);
    expect(sortArriving(once, again.events).save).toEqual([]);
    expect(again.values).toEqual([]);
  });

  test('(c) a broker with no tax lots: one line at its average, no date', () => {
    const p = payload({ positions: [{ symbol: msft, units: 500, price: 450, average_purchase_price: 350 }], activities: [] });
    const u = brokerUpdateToRecord([], p, ACC);
    expect(u.lists).toEqual([{ holding: 'MSFT', listed: [{ date: null, shares: 500, price: 350, average: true }] }]);
    const rec = runUpdate([], p, NOW);
    expect(sharesOnRecord(rec, ACC, 'MSFT')).toBe(500);
    expect(rec.find((r) => r.kind === 'PURCHASE')).toMatchObject({ averageOnly: true, date: null });
  });

  test('(d) an activity with no trade date keeps a blank date — never the day of the sync', () => {
    const p = payload({ activities: [{ type: 'BUY', units: 10, price: 400, amount: -4000, symbol: msft }] });
    const u = brokerUpdateToRecord([], p, ACC);
    expect(u.events[0].date).toBeNull();
    expect(u.events[0].settlementDate).toBeNull();
    expect(u.events[0].ref).toMatch(/acc|MSFT|BUY/i);   // the sync's own key, where the broker sends no id
    const rec = addRows([], sortArriving([], u.events).save, NOW);
    expect(rec[0].date).toBeNull();
  });

  test('(e) a dividend keeps both dates and no minus sign', () => {
    const p = payload({ activities: [{ id: 'd1', type: 'DIVIDEND', trade_date: '2026-09-10', settlement_date: '2026-09-11', amount: 415, symbol: msft }] });
    const [e] = brokerUpdateToRecord([], p, ACC).events;
    expect(e).toMatchObject({ kind: 'DIVIDEND', holding: 'MSFT', date: '2026-09-10', settlementDate: '2026-09-11', amount: 415, ref: 'd1' });
  });

  test('(f) a sale sent as a negative quantity is saved without the minus sign', () => {
    const p = payload({ activities: [{ id: 's1', type: 'SELL', trade_date: '2026-10-01', units: -100, price: 460, amount: 46000, symbol: msft }] });
    const [e] = brokerUpdateToRecord([], p, ACC).events;
    expect(e).toMatchObject({ kind: 'SALE', holding: 'MSFT', date: '2026-10-01', shares: 100, price: 460, amount: 46000 });
  });

  test('(g) the holdings date is the broker\'s last update of the holdings, not the phone\'s date', () => {
    const p = payload({ account: acct({ sync_status: { holdings: { last_successful_sync: '2026-09-15T23:59:00Z' } } }) });
    const rec = runUpdate([], p, NOW);
    expect(valuesNow(rec, ACC)!.date).toBe('2026-09-15');
    expect(rec.some((r) => r.date === NOW.slice(0, 10))).toBe(false);
    const none = brokerUpdateToRecord([], payload({ account: acct({ sync_status: null }) }), ACC);
    expect(none.listDay).toBeNull();
    expect(none.values.every((v) => v.date === null)).toBe(true);
  });
  test('(h) an option: 2 contracts of a standard call are 200 shares, priced per share; a mini option is 10 a contract', () => {
    const call = (mini: boolean) => ({ symbol: { option_symbol: { ticker: 'AAPL  270116C00220000', option_type: 'CALL' as const, strike_price: 220, expiration_date: '2027-01-16',
      underlying_symbol: { raw_symbol: 'AAPL' }, is_mini_option: mini } }, units: 2, price: 6.5, average_purchase_price: 500 });
    const u = brokerUpdateToRecord([], payload({ optionPositions: [call(false)] }), ACC);
    expect(u.lists[1]).toEqual({ holding: 'AAPL  270116C00220000', listed: [{ date: null, shares: 200, price: 5, average: true }] });
    expect(u.values[2]).toMatchObject({ holding: 'AAPL  270116C00220000', shares: 200, price: 6.5, amount: 1300 });
    const m = brokerUpdateToRecord([], payload({ optionPositions: [call(true)] }), ACC);
    expect(m.lists[1].listed[0]).toMatchObject({ shares: 20, price: 50 });
  });
});
