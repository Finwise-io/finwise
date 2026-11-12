/* THE DAY'S VALUE FROM THE PRICE FEED (phase 2, 2026-11-11). Each case states its holdings and closes, so every value
 * can be worked by hand. */
import { priceFeedValues } from './asset-record-from-prices';
import { addRows, valueRows, valuesNow, valueBatchesOf, type AssetRow, type NewRow } from './asset-record';

const AT = '2026-11-08T10:00:00.000Z', AT2 = '2026-11-08T10:10:00.000Z';
const buy = (shares: number, price: number, date: string, holding = 'VTI'): NewRow => ({ accountId: 'van', holding, kind: 'PURCHASE', date, shares, price, amount: shares * price, source: 'typed' });
const series = (ticker: string, pts: [string, number][]) => ({ ticker, points: pts.map(([date, close]) => ({ date, close })) });
const PRICES = { VTI: series('VTI', [['2026-11-05', 295], ['2026-11-06', 300]]) };
const accts = [{ asset_id: 'van', positions: [{ position_id: 'p', ticker: 'VTI', kind: 'stocks_etf', lots: [] }] as any }];

test('100 VTI, refreshed on Sunday Nov 8: one value dated Friday Nov 6 (the close\'s own day), 100 × $300 = $30,000', () => {
  const rec = addRows([], [buy(100, 80, '2025-03-03')], AT);
  const rows = priceFeedValues(rec, accts, PRICES);
  const saved = addRows(rec, rows, AT2);
  const now = valuesNow(saved, 'van');
  expect(now?.date).toBe('2026-11-06');
  expect(now?.source).toBe('price-feed');
  expect(now?.holdings).toEqual([{ holding: 'VTI', shares: 100, price: 300, value: 30_000 }]);
  // no cash was ever given for this account, so the total stays blank — an unknown is not $0
  expect(now?.total).toBeNull();
});

test('cash of $500 given on Nov 1 is carried: the total on Nov 6 is $30,000 + $500 = $30,500', () => {
  let rec = addRows([], [buy(100, 80, '2025-03-03')], AT);
  rec = addRows(rec, valueRows({ accountId: 'van', date: '2026-11-01', source: 'typed', cash: 500 }), AT);
  const saved = addRows(rec, priceFeedValues(rec, accts, PRICES), AT2);
  expect(valuesNow(saved, 'van')).toMatchObject({ date: '2026-11-06', cash: 500, total: 30_500 });
});

test('a second refresh with the same closes adds nothing', () => {
  const rec = addRows([], [buy(100, 80, '2025-03-03')], AT);
  const once = addRows(rec, priceFeedValues(rec, accts, PRICES), AT2);
  expect(priceFeedValues(once, accts, PRICES)).toEqual([]);
});

test('a day a broker, a file or the account holder already gave values for gets no price-feed values', () => {
  let rec = addRows([], [buy(100, 80, '2025-03-03')], AT);
  rec = addRows(rec, valueRows({ accountId: 'van', date: '2026-11-06', source: 'typed', cash: 0, holdings: [{ holding: 'VTI', shares: 100, price: 299, value: 29_900 }] }), AT);
  expect(priceFeedValues(rec, accts, PRICES)).toEqual([]);
});

test('100 bought, 40 sold on Nov 6: the value on Nov 6 counts the 60 left, 60 × $300 = $18,000', () => {
  const rec = addRows([], [buy(100, 80, '2025-03-03'), { accountId: 'van', holding: 'VTI', kind: 'SALE', date: '2026-11-06', shares: 40, price: 300, amount: 12_000, source: 'typed' }], AT);
  const saved = addRows(rec, priceFeedValues(rec, accts, PRICES), AT2);
  expect(valuesNow(saved, 'van')?.holdings).toEqual([{ holding: 'VTI', shares: 60, price: 300, value: 18_000 }]);
});

test('a holding with no close in the feed keeps the value last given for the same shares; with other shares it stays blank', () => {
  let rec = addRows([], [buy(100, 80, '2025-03-03'), buy(10, 50, '2025-04-01', 'XYZFUND')], AT);
  rec = addRows(rec, valueRows({ accountId: 'van', date: '2026-11-01', source: 'typed', cash: 0, holdings: [{ holding: 'XYZFUND', shares: 10, price: 52, value: 520 }, { holding: 'VTI', shares: 100, price: 290, value: 29_000 }] }), AT);
  const saved = addRows(rec, priceFeedValues(rec, accts, PRICES), AT2);
  const now = valuesNow(saved, 'van');
  expect(now?.holdings).toEqual(expect.arrayContaining([{ holding: 'XYZFUND', shares: 10, price: 52, value: 520 }, { holding: 'VTI', shares: 100, price: 300, value: 30_000 }]));
  expect(now?.total).toBe(30_520);
});

test('an account with nothing held gets no values; a holding the feed has never priced gets none either', () => {
  expect(priceFeedValues([], accts, PRICES)).toEqual([]);
  const rec = addRows([], [buy(10, 50, '2025-04-01', 'XYZFUND')], AT);
  expect(priceFeedValues(rec, accts, PRICES)).toEqual([]);
  expect(valueBatchesOf(rec, 'van')).toEqual([]);
});

test('a fund whose last close is 10 days before the day is not valued at that old close: it keeps the value last given', () => {
  let rec = addRows([], [buy(100, 80, '2025-03-03'), buy(10, 50, '2025-04-01', 'OLDFUND')], AT);
  rec = addRows(rec, valueRows({ accountId: 'van', date: '2026-10-20', source: 'typed', cash: 0, holdings: [{ holding: 'OLDFUND', shares: 10, price: 51, value: 510 }] }), AT);
  const prices = { ...PRICES, OLDFUND: series('OLDFUND', [['2026-10-27', 60]]) };
  const saved = addRows(rec, priceFeedValues(rec, accts, prices), AT2);
  expect(valuesNow(saved, 'van')?.holdings).toEqual(expect.arrayContaining([{ holding: 'OLDFUND', shares: 10, price: 51, value: 510 }]));
});
