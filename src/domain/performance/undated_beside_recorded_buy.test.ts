/** A PURCHASE WITH NO DATE BESIDE BUYS THE ACCOUNT RECORDED (2026-10-25, FIX-HOLDINGS item 1; MK-PF-F-014 buildPerformance, through
 *  MK-NW-F-168 holdingRowsIn, the one function the account page and the Holding page ask). Worked by hand:
 *    100 VTI imported with no date; $95 at the Aug 29 close (the evening before the 1M window), $99 on Sep 29, $100 today (Sep 30);
 *    20 more bought today at $100 on the trade sheet (a BUY record of the account, and the dated purchase it wrote).
 *    Held when the window began: 120 − 20 = 100 shares × $95 = $9,500. Paid inside it: 20 × $100 = $2,000. Gained: $12,000 − $9,500
 *    − $2,000 = $500. Its return, split at the purchase, which counts from the start of its day at what was paid (DEC-4439, DEC-7451):
 *    9,900 ÷ 9,500 × 12,000 ÷ (9,900 + 2,000) − 1 = +5.0862…%.
 *  The same two purchases with no buy record (only typed on the holding) keep DEC-7216: no return since purchase. */
import { holdingRowsIn } from '../../../MoneyKeel/functions/networth-and-performance/holding';
import { pricedGainOf } from '../../../MoneyKeel/functions/networth-and-performance/performance';

const NOW = new Date('2026-09-30T12:00:00');
const closes = (pts: [string, number][]) => ({ ticker: 'VTI', points: pts.map(([date, close]) => ({ date, close })) });
const VTI = closes([['2025-03-03', 80], ['2026-08-29', 95], ['2026-09-29', 99], ['2026-09-30', 100]]);
const SPY = { ...closes([['2025-03-03', 500], ['2026-08-29', 600], ['2026-09-30', 612]]), ticker: 'SPY' };
const priceOf = (t: string) => (t === 'VTI' ? VTI : t === 'SPY' ? SPY : null);
const position = () => ({ position_id: 'vti', ticker: 'VTI', kind: 'stocks_etf',
  lots: [{ lot_id: 'v1', shares: 100, cost_per_share: 100, purchase_date: '' }, { lot_id: 'v2', shares: 20, cost_per_share: 100, purchase_date: '2026-09-30' }] }) as any;
const account = (p: any) => ({ asset_id: 'imp', label: 'Brokerage', institution: 'Schwab', kind: 'brokerage', source: 'imported', derive_balance: true,
  balance: 10_000, cash_balance: -2_000, positions: [p] }) as any;
const BUY = { id: 'b', account_id: 'imp', type: 'BUY', ticker: 'VTI', shares: 20, price: 100, date: '2026-09-30', created_at: '2026-09-30T12:00:00Z' };
const rowOf = (transactions: any[]) => {
  const p = position();
  return holdingRowsIn({ account: account(p), positions: [p], priceOf: priceOf as any, period: '1M', transactions, now: NOW })[0];
};

test('beside a buy the account recorded: held when the window began — start $9,500, paid inside $2,000, gained $500, +5.09%, not bought inside the window', () => {
  const r = rowOf([BUY]);
  expect(r.cappedSince).toBeNull();
  expect(r.undatedPurchase).toBeUndefined();
  expect(r.startValue).toBeCloseTo(9_500, 9);
  expect(r.paidInside).toBeCloseTo(2_000, 9);
  expect(r.periodTotal!).toBeCloseTo(9_900 / 9_500 * 12_000 / 11_900 - 1, 12);
  expect(pricedGainOf([r as any])).toBeCloseTo(500, 9);
});

test('the same purchases with no buy record keep DEC-7216: bought inside the window from Sep 30, no return since purchase, the reason on the row', () => {
  const r = rowOf([]);
  expect([r.cappedSince, r.periodReturn, r.periodTotal, r.undatedPurchase]).toEqual(['2026-09-30', null, null, true]);
});

test('a buy record smaller than the dated purchase does not explain it: DEC-7216 holds (10 recorded, 20 dated)', () => {
  const r = rowOf([{ ...BUY, shares: 10 }]);
  expect([r.cappedSince, r.periodTotal]).toEqual(['2026-09-30', null]);
});
