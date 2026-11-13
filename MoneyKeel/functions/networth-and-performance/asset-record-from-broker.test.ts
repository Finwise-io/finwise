// One broker update, read into the one master record (asset-record-from-broker.ts), then run through the record's
// own calling order: sortArriving → addRows; purchasesFromList → addRows; valueRows → addRows.
import { brokerUpdateToRecord } from './asset-record-from-broker';
import {
  addRows, sortArriving, purchasesFromList, answerListQuestion, answerEventQuestion, removeRow, sharesThatDisagree, sharesOnRecord, valuesNow, rowsInForce, saleGain,
  listQuestionToAsk, answerQuestion,
  type AssetRow, type ListQuestion, type EventQuestion,
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
  // the broker's stamp, written on the phone's own clock: its day is Sept 15 wherever the test runs
  sync_status: { holdings: { initial_sync_completed: true, last_successful_sync: '2026-09-15T06:00:00' } },
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
      amount: 175000, fee: 0, source: 'linked', ref: 'st-acc-1|2026-07-30|BUY|-175000|500|u-msft||' });   // the activity's content, never the broker's id (it can change)
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
    expect(e).toMatchObject({ kind: 'DIVIDEND', holding: 'MSFT', date: '2026-09-10', settlementDate: '2026-09-11', amount: 415, ref: 'st-acc-1|2026-09-10|DIVIDEND|415||u-msft||' });
  });

  test('(f) a sale sent as a negative quantity is saved without the minus sign', () => {
    const p = payload({ activities: [{ id: 's1', type: 'SELL', trade_date: '2026-10-01', units: -100, price: 460, amount: 46000, symbol: msft }] });
    const [e] = brokerUpdateToRecord([], p, ACC).events;
    expect(e).toMatchObject({ kind: 'SALE', holding: 'MSFT', date: '2026-10-01', shares: 100, price: 460, amount: 46000 });
  });

  test('(g) the holdings date is the broker\'s last update of the holdings, not the phone\'s date', () => {
    const p = payload({ account: acct({ sync_status: { holdings: { last_successful_sync: '2026-09-15T23:59:00' } } }) });
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

/** The full calling order, with every question the update raises. */
function runAsking(record: AssetRow[], p: AccountSyncPayload, at: string): { rec: AssetRow[]; asks: (ListQuestion | { why: string })[]; listDay: string | null } {
  const u = brokerUpdateToRecord(record, p, ACC);
  const sorted = sortArriving(record, u.events);
  let rec = addRows(record, sorted.save, at);
  const asks: (ListQuestion | { why: string })[] = [...sorted.ask];
  const rows = [];
  for (const l of u.lists) { const g = purchasesFromList(rec, ACC, l.holding, l.listed, 'linked', u.listDay, sorted.ask); rows.push(...g.rows); asks.push(...g.ask); }
  rec = addRows(rec, [...rows, ...u.values], at);
  return { rec, asks, listDay: u.listDay };
}
/** A broker time-stamp written in the phone's own time zone (no offset), so its day is the same wherever the test runs. */
const localStamp = (day: string) => `${day}T12:00:00`;
const sync = (day: string, total = 0) => acct({ balance: { total: { amount: total, currency: 'USD' } }, sync_status: { holdings: { initial_sync_completed: true, last_successful_sync: localStamp(day) } } });

describe('the faults the outside checker reproduced (2026-11-12)', () => {
  test('a bond quoted per $100 of face: 10,000 face bought at 97 is $9,700 from the list too, and selling 5,000 at 99 makes $100', () => {
    const bond = { id: 'u-b', raw_symbol: '912828XX1', description: 'US TREASURY NOTE 4% 2030', type: { code: 'bnd' } } as any;
    const lot = (qty: number) => [{ original_purchase_date: '2026-02-01', quantity: qty, purchased_price: 97 }];
    const p1 = payload({ account: sync('2026-09-15', 9850), positions: [{ symbol: bond, units: 10000, price: 98.5, average_purchase_price: 97, tax_lots: lot(10000) }],
      activities: [{ id: 'bb1', type: 'BUY', trade_date: '2026-02-01', units: 10000, price: 97, amount: -9700, symbol: bond }] });
    const u = brokerUpdateToRecord([], p1, ACC);
    expect(u.lists[0].listed).toEqual([{ date: '2026-02-01', shares: 10000, price: 0.97 }]);
    let r = runAsking([], p1, NOW).rec;
    expect(rowsInForce(r).filter((x) => x.kind === 'PURCHASE' && !x.inListOf).map((x) => [x.shares, x.price, x.amount])).toEqual([[10000, 0.97, 9700]]);
    const p2 = payload({ account: sync('2026-10-02', 4950), positions: [{ symbol: bond, units: 5000, price: 99, average_purchase_price: 97, tax_lots: lot(5000) }],
      activities: [...p1.activities!, { id: 'bs1', type: 'SELL', trade_date: '2026-10-01', units: -5000, price: 99, amount: 4950, symbol: bond }] });
    const out = runAsking(r, p2, '2026-11-13T10:00:00.000Z');
    r = out.rec;
    const sale = r.find((x) => x.kind === 'SALE')!;
    expect(saleGain(r, sale.rowId)).toBeCloseTo(100, 6);   // 5,000 × (0.99 − 0.97)
    expect(out.asks).toEqual([]);
    // a broker that sends only an average is read the same way: 97 per $100 is 0.97 a unit of face
    const avg = brokerUpdateToRecord([], payload({ account: sync('2026-09-15', 9850), positions: [{ symbol: bond, units: 10000, price: 98.5, average_purchase_price: 97 }], activities: [] }), ACC);
    expect(avg.lists[0].listed).toEqual([{ date: null, shares: 10000, price: 0.97, average: true }]);
  });

  test('a two-for-one split the broker sends as 100 more shares of 100 NVDA held is a split: 200 shares at $400, no question', () => {
    const nvda = { id: 'u-nvda', raw_symbol: 'NVDA', description: 'NVIDIA', type: { code: 'cs' } } as any;
    const buy = { id: 'b1', type: 'BUY', trade_date: '2026-01-05', units: 100, price: 800, amount: -80000, symbol: nvda };
    const p1 = payload({ account: sync('2026-03-01', 90000), positions: [{ symbol: nvda, units: 100, price: 900, average_purchase_price: 800,
      tax_lots: [{ original_purchase_date: '2026-01-05', quantity: 100, purchased_price: 800 }] }], activities: [buy] });
    const first = runAsking([], p1, NOW).rec;
    for (const word of ['SPLIT', 'STOCK_SPLIT', 'CORPORATE_ACTION']) {
      const p2 = payload({ account: sync('2026-06-15', 92000), positions: [{ symbol: nvda, units: 200, price: 460, average_purchase_price: 400,
        tax_lots: [{ original_purchase_date: '2026-01-05', quantity: 200, purchased_price: 400 }] }],
        activities: [buy, { id: 'sp1', type: word, trade_date: '2026-06-10', units: 100, price: 0, amount: 0, symbol: nvda, description: '2:1 FORWARD SPLIT' }] });
      expect(brokerUpdateToRecord(first, p2, ACC).events[1]).toMatchObject({ kind: 'SPLIT', holding: 'NVDA', date: '2026-06-10', ratio: 2 });
      const out = runAsking(first, p2, '2026-11-12T10:00:00.000Z');
      expect([word, sharesOnRecord(out.rec, ACC, 'NVDA'), out.asks]).toEqual([word, 200, []]);
    }
    // a corporate action that is not called a split, or one whose shares held that day are not known, is kept as the broker's word
    const merger = payload({ activities: [buy, { id: 'm1', type: 'CORPORATE_ACTION', trade_date: '2026-06-10', units: 100, symbol: nvda, description: 'MERGER EXCHANGE' }] });
    expect(brokerUpdateToRecord(first, merger, ACC).events[1].kind).toBe('OTHER');
    const unknown = payload({ activities: [{ id: 'sp2', type: 'SPLIT', trade_date: '2026-06-10', units: 100, symbol: nvda, description: '2:1 FORWARD SPLIT' }] });
    expect(brokerUpdateToRecord([], unknown, ACC).events[0].kind).toBe('OTHER');
  });

  test('a sale of 100 MSFT on Oct 1 that arrives before the tax lots catch up: the Sep 30 list of 350 is not contradicted — 250 held, no question', () => {
    const lots = (a: number, b: number) => [{ original_purchase_date: '2026-07-01T00:00:00Z', quantity: a, purchased_price: 300 }, { original_purchase_date: '2026-09-20T00:00:00Z', quantity: b, purchased_price: 400 }];
    const acts = [
      { id: 'b1', type: 'BUY', trade_date: '2026-07-01', units: 500, price: 300, amount: -150000, fee: 0, symbol: msft },
      { id: 's1', type: 'SELL', trade_date: '2026-08-01', units: -200, price: 350, amount: 70000, fee: 0, symbol: msft },
      { id: 'b2', type: 'BUY', trade_date: '2026-09-20', units: 50, price: 400, amount: -20000, fee: 0, symbol: msft }];
    let r = runAsking([], payload({ account: sync('2026-09-25', 350 * 460), positions: [{ symbol: msft, units: 350, price: 460, average_purchase_price: 314.29, tax_lots: lots(300, 50) }], activities: acts }), NOW).rec;
    expect(sharesOnRecord(r, ACC, 'MSFT')).toBe(350);
    const late = payload({ account: sync('2026-09-30', 350 * 470), positions: [{ symbol: msft, units: 350, price: 470, average_purchase_price: 314.29, tax_lots: lots(300, 50) }],
      activities: [...acts, { id: 's2', type: 'SELL', trade_date: '2026-10-01', units: -100, price: 470, amount: 47000, fee: 0, symbol: msft }] });
    const out = runAsking(r, late, '2026-11-13T10:00:00.000Z');
    expect([sharesOnRecord(out.rec, ACC, 'MSFT'), out.asks]).toEqual([250, []]);
    // the lots catch up on Oct 2: 200 of Jul 1 and 50 of Sep 20 — still 250, still no question
    r = out.rec;
    const caught = runAsking(r, payload({ account: sync('2026-10-02', 250 * 470), positions: [{ symbol: msft, units: 250, price: 470, average_purchase_price: 320, tax_lots: lots(200, 50) }],
      activities: late.activities }), '2026-11-14T10:00:00.000Z');
    expect([sharesOnRecord(caught.rec, ACC, 'MSFT'), caught.asks]).toEqual([250, []]);
  });

  test('2 calls bought at $6.50 a share with no amount sent are $6.50 a share and $1,300 — the same as when the amount is sent', () => {
    const os = { ticker: 'AAPL  270116C00220000', option_type: 'CALL', strike_price: 220, expiration_date: '2027-01-16', underlying_symbol: { raw_symbol: 'AAPL' }, is_mini_option: false };
    const act = (amount?: number) => ({ id: 'o1', type: 'BUY', option_type: 'BUY_TO_OPEN', trade_date: '2026-08-01', units: 2, price: 6.5, ...(amount != null ? { amount } : {}), symbol: null, option_symbol: os });
    for (const amount of [undefined, -1300]) {
      const [e] = brokerUpdateToRecord([], payload({ positions: [], activities: [act(amount)] }), ACC).events;
      expect([amount, e.kind, e.shares, e.price, e.amount]).toEqual([amount, 'PURCHASE', 200, 6.5, 1300]);
    }
  });

  test('30 AAPL typed at $90 with no date, then linked with a broker average of $95: asked on the first link, not only when the average moves', () => {
    const typed = addRows([], [{ accountId: ACC, holding: 'AAPL', kind: 'PURCHASE', date: null, shares: 30, price: 90, amount: 2700, source: 'typed' }], '2026-11-01T00:00:00.000Z');
    const aapl = { id: 'u-aapl', raw_symbol: 'AAPL', description: 'Apple', type: { code: 'cs' } } as any;
    const p = payload({ account: sync('2026-11-05', 6000), positions: [{ symbol: aapl, units: 30, price: 200, average_purchase_price: 95 }], activities: [] });
    const out = runAsking(typed, p, NOW);
    expect(out.asks.map((q) => ('kind' in q ? [q.kind, q.sharesOnRecord, q.listed[0].price] : q.why))).toEqual([['price', 30, 95]]);
    // "the list is correct": the purchase is $95 a share from then on, and the same average asks nothing again
    const q = out.asks[0] as ListQuestion;
    const answered = addRows(out.rec, answerListQuestion(out.rec, q, true, 'linked', out.listDay), '2026-11-11T11:00:00.000Z');
    expect(rowsInForce(answered).filter((x) => x.kind === 'PURCHASE').map((x) => [x.shares, x.price])).toEqual([[30, 95]]);
    expect(runAsking(answered, p, '2026-11-12T10:00:00.000Z').asks).toEqual([]);
    // "mine is correct": $90 stands, and the same average asks nothing again
    const kept = addRows(out.rec, answerListQuestion(out.rec, q, false, 'linked', out.listDay), '2026-11-11T11:00:00.000Z');
    expect(rowsInForce(kept).filter((x) => x.kind === 'PURCHASE').map((x) => [x.shares, x.price])).toEqual([[30, 90]]);
    expect(runAsking(kept, p, '2026-11-12T10:00:00.000Z').asks).toEqual([]);
  });

  test('one instant of the broker\'s last update gives one day, however it is written: the day of that instant on the phone\'s clock', () => {
    const at = (stamp: string) => brokerUpdateToRecord([], payload({ account: acct({ sync_status: { holdings: { last_successful_sync: stamp } } }) }), ACC).listDay;
    const instant = Date.parse('2026-09-16T01:00:00Z');
    const d = new Date(instant);
    const localDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect([at('2026-09-15T21:00:00-04:00'), at('2026-09-16T01:00:00Z')]).toEqual([localDay, localDay]);
    expect(at('2026-09-15')).toBe('2026-09-15');                 // a plain day stays as given
  });
});

describe('the faults the second outside check reproduced (2026-11-12)', () => {
  const day = (d: string, total = 0) => sync(d, total);
  const lot = (d: string, q: number, p: number) => ({ original_purchase_date: d, quantity: q, purchased_price: p });
  const held = (sym: any, price: number, lots: { quantity: number }[]) => [{ symbol: sym, units: lots.reduce((n, l) => n + l.quantity, 0), price, tax_lots: lots as any }];

  test('a sale of 40 of 100 MSFT sent as A1 and sent again as A2 is one sale: 60 held, nothing asked', () => {
    const sale = (id: string) => ({ id, type: 'SELL', trade_date: '2026-03-10', units: -40, price: 65, amount: 2600, symbol: msft });
    let r = runAsking([], payload({ account: day('2026-03-01'), positions: held(msft, 70, [lot('2026-01-10', 100, 50)]), activities: [] }), NOW).rec;
    r = runAsking(r, payload({ account: day('2026-03-09'), positions: held(msft, 70, [lot('2026-01-10', 100, 50)]), activities: [sale('A1')] }), '2026-11-12T10:00:00.000Z').rec;
    const again = runAsking(r, payload({ account: day('2026-03-09'), positions: held(msft, 70, [lot('2026-01-10', 100, 50)]), activities: [sale('A2')] }), '2026-11-13T10:00:00.000Z');
    expect([sharesOnRecord(again.rec, ACC, 'MSFT'), rowsInForce(again.rec).filter((x) => x.kind === 'SALE').length, again.asks]).toEqual([60, 1, []]);
    // two sales alike in one update are two sales: the broker's own list says so — 20 held
    const two = runAsking(r, payload({ account: day('2026-03-09'), positions: held(msft, 70, [lot('2026-01-10', 100, 50)]), activities: [sale('A2'), sale('B1')] }), '2026-11-13T10:00:00.000Z');
    expect([sharesOnRecord(two.rec, ACC, 'MSFT'), rowsInForce(two.rec).filter((x) => x.kind === 'SALE').length]).toEqual([20, 2]);
    // a sale already saved under the broker's id before this change stays one sale when the same id, or a new id, comes again
    const old = r.map((x) => (x.kind === 'SALE' ? { ...x, ref: 'A1' } : x));
    for (const id of ['A1', 'A2']) {
      const out = runAsking(old, payload({ account: day('2026-03-09'), positions: held(msft, 70, [lot('2026-01-10', 100, 50)]), activities: [sale(id)] }), '2026-11-13T10:00:00.000Z');
      expect([id, sharesOnRecord(out.rec, ACC, 'MSFT'), out.rec.length - old.length - out.rec.filter((x) => x.kind === 'VALUE' && !old.includes(x)).length, out.asks]).toEqual([id, 60, 0, []]);
    }
  });

  test('a bond bought 5,000 face at 97 and sold 3,000 at 99 with no dollar amount sent: $4,850, $2,970 and a gain of $30', () => {
    const bond = { id: 'u-tsy', raw_symbol: '91282CGM7', description: 'US TREASURY NOTE 4.25% 02/15/2027', type: { code: 'bnd' } } as any;
    const lots2 = [lot('2026-02-01', 10000, 98), lot('2026-04-01', 5000, 97)];
    let r = runAsking([], payload({ account: day('2026-03-01', 9900), positions: held(bond, 99, [lot('2026-02-01', 10000, 98)]), activities: [] }), NOW).rec;
    r = runAsking(r, payload({ account: day('2026-04-03', 14850), positions: held(bond, 99, lots2),
      activities: [{ id: 'b2', type: 'BUY', trade_date: '2026-04-01', units: 5000, price: 97, symbol: bond }] }), '2026-11-12T10:00:00.000Z').rec;
    const out = runAsking(r, payload({ account: day('2026-04-30', 14850), positions: held(bond, 99, lots2),
      activities: [{ id: 's2', type: 'SELL', trade_date: '2026-05-01', units: -3000, price: 99, symbol: bond }] }), '2026-11-13T10:00:00.000Z');
    const buy = rowsInForce(out.rec).find((x) => x.kind === 'PURCHASE' && x.date === '2026-04-01')!;
    const sale = rowsInForce(out.rec).find((x) => x.kind === 'SALE')!;
    expect([buy.price, buy.amount, sale.price, sale.amount]).toEqual([0.97, 4850, 0.99, 2970]);
    expect(saleGain(out.rec, sale.rowId)).toBeCloseTo(30, 6);   // 3,000 × (0.99 − 0.98)
    expect(out.asks).toEqual([]);
  });

  // CHANGED 2026-11-12 (design v02, rule 3 · L6): this case asked two questions, one per lot; the lots differ only by
  // which purchase the sale of 50 came from, so it is ONE question — and "the list is correct" names the Feb lot
  test('two lots of 100, a sale of 50, the Feb lot shown sold: ONE question (L6); "mine", then changed to "the list is correct": 150, the sale makes $250, nothing more is asked', () => {
    const both = [lot('2026-01-10', 100, 50), lot('2026-02-10', 100, 60)], after = [lot('2026-01-10', 100, 50), lot('2026-02-10', 50, 60)];
    let r = runAsking([], payload({ account: day('2026-03-01'), positions: held(msft, 70, both), activities: [] }), NOW).rec;
    r = runAsking(r, payload({ account: day('2026-03-09'), positions: held(msft, 70, both),
      activities: [{ id: 's1', type: 'SELL', trade_date: '2026-03-10', units: -50, price: 65, amount: 3250, symbol: msft }] }), '2026-11-12T10:00:00.000Z').rec;
    const out = runAsking(r, payload({ account: day('2026-03-12', 10500), positions: held(msft, 70, after), activities: [] }), '2026-11-12T11:00:00.000Z');
    r = out.rec;
    const qs = out.asks as ListQuestion[];
    expect(qs.map((q) => q.kind)).toEqual(['sold-from']);
    const [q] = listQuestionToAsk(r, qs[0], () => 'Robinhood');
    expect(q.kind).toBe('L6');
    const sale = rowsInForce(r).find((x) => x.kind === 'SALE')!;
    expect(saleGain(r, sale.rowId)).toBe(750);
    r = answerQuestion(r, q, { id: 'mine-correct' }, '2026-11-12T12:00:00.000Z').record;
    expect([sharesOnRecord(r, ACC, 'MSFT'), saleGain(r, sale.rowId)]).toEqual([150, 750]);
    r = answerQuestion(r, q, { id: 'list-correct' }, '2026-11-12T13:00:00.000Z').record;
    // the keep-mine fact is undone, and the sale names the Feb lot: 50 × ($65 − $60) = $250
    expect([sharesOnRecord(r, ACC, 'MSFT'), saleGain(r, sale.rowId), rowsInForce(r).filter((x) => typeof x.facts?.keepsOverList === 'string').length]).toEqual([150, 250, 0]);
    const later = runAsking(r, payload({ account: day('2026-03-15', 10500), positions: held(msft, 70, after), activities: [] }), '2026-11-13T10:00:00.000Z');
    expect([sharesOnRecord(later.rec, ACC, 'MSFT'), later.asks, sharesThatDisagree(later.rec, ACC)]).toEqual([150, [], []]);
  });

  test('lots of 10 and 20; the Jan lot and its purchase taken away; the broker sends it again and "theirs" brings it back: 30, nothing asked', () => {
    const vti = { id: 'u-vti', raw_symbol: 'VTI', description: 'VTI', type: { code: 'cs' } } as any;
    const L = [lot('2026-01-10', 10, 200), lot('2026-02-10', 20, 210)];
    const B1 = { id: 'b1', type: 'BUY', trade_date: '2026-01-10', units: 10, price: 200, amount: -2000, symbol: vti };
    const B2 = { id: 'b2', type: 'BUY', trade_date: '2026-02-10', units: 20, price: 210, amount: -4200, symbol: vti };
    const P = (d: string) => payload({ account: day(d), positions: held(vti, 250, L), activities: [B1] });
    let base = runAsking([], payload({ account: day('2026-03-01'), positions: held(vti, 250, L), activities: [B1, B2] }), NOW).rec;
    for (const id of rowsInForce(base).filter((x) => x.kind === 'PURCHASE' && x.date === '2026-01-10').map((x) => x.rowId)) base = removeRow(base, id, 'typed', '2026-11-11T10:00:00.000Z').record;
    expect(sharesOnRecord(base, ACC, 'VTI')).toBe(20);
    const first = runAsking(base, P('2026-03-05'), '2026-11-12T10:00:00.000Z');
    const ev = first.asks.find((q): q is EventQuestion => 'why' in q && q.why === 'taken-away')!;
    const li = first.asks.find((q): q is ListQuestion => 'kind' in q && q.kind === 'removed')!;
    expect([!!ev, !!li]).toEqual([true, true]);
    // "theirs" on the event: the purchase is back with its shares, and neither question is asked again
    let r = addRows(first.rec, answerEventQuestion(ev, 'theirs', first.rec), '2026-11-12T11:00:00.000Z');
    let next = runAsking(r, P('2026-03-07'), '2026-11-13T10:00:00.000Z');
    expect([sharesOnRecord(next.rec, ACC, 'VTI'), next.asks.length, sharesThatDisagree(next.rec, ACC)]).toEqual([30, 0, []]);
    // "mine" on the event settles the list's question too, and the list's "mine" settles the event's
    r = addRows(first.rec, answerEventQuestion(ev, 'mine', first.rec), '2026-11-12T11:00:00.000Z');
    next = runAsking(r, P('2026-03-07'), '2026-11-13T10:00:00.000Z');
    expect([sharesOnRecord(next.rec, ACC, 'VTI'), next.asks.length, sharesThatDisagree(next.rec, ACC)]).toEqual([20, 0, []]);
    r = addRows(first.rec, answerListQuestion(first.rec, li, false, 'linked', first.listDay), '2026-11-12T11:00:00.000Z');
    next = runAsking(r, P('2026-03-07'), '2026-11-13T10:00:00.000Z');
    expect([sharesOnRecord(next.rec, ACC, 'VTI'), next.asks.length, sharesThatDisagree(next.rec, ACC)]).toEqual([20, 0, []]);
  });
});
