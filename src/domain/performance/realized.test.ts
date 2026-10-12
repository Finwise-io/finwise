// Realized P/L pins — FIFO honesty: oldest lots first, unpriceable sells never guessed,
// account-scoped queues, calendar-year split.
import { realizedFromLedger } from './realized';
import type { Transaction } from '../transactions';

const yr = new Date().getFullYear();
const t = (over: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36) as any, date: `${yr}-03-01`, type: 'BUY', account_id: 'acc' as any,
  ticker: 'VTI', shares: 10, price: 100, created_at: 'x', ...over,
} as Transaction);

test('FIFO: the oldest buy is consumed first; gain = proceeds − that basis', () => {
  const r = realizedFromLedger([
    t({ date: `${yr - 1}-01-01`, shares: 10, price: 100 }),
    t({ date: `${yr - 1}-06-01`, shares: 10, price: 150 }),
    t({ date: `${yr}-02-01`, type: 'SELL', shares: 12, price: 200 }),
  ]);
  // 10 @100 + 2 @150 = 1300 basis; proceeds 2400 → +1100
  expect(r.realizedAllTime).toBe(1100);
  expect(r.realizedThisYear).toBe(1100);
  expect(r.sellsCounted).toBe(1);
  expect(r.sellsWithoutBasis).toBe(0);
});

test('a sale with no recorded buy contributes NOTHING — reported, never guessed', () => {
  const r = realizedFromLedger([t({ type: 'SELL', shares: 5, price: 300 })]);
  expect(r.realizedAllTime).toBe(0);
  expect(r.sellsWithoutBasis).toBe(1);
});

test('last year’s sale counts all-time but not this year; queues are account-scoped', () => {
  const r = realizedFromLedger([
    t({ date: `${yr - 2}-01-01`, shares: 10, price: 100 }),
    t({ date: `${yr - 1}-05-01`, type: 'SELL', shares: 10, price: 120 }),      // +200 last year
    t({ date: `${yr - 2}-01-01`, account_id: 'other' as any, shares: 10, price: 50 }),
    t({ date: `${yr}-01-05`, account_id: 'other' as any, type: 'SELL', shares: 10, price: 60 }),  // +100 this year
  ]);
  expect(r.realizedAllTime).toBe(300);
  expect(r.realizedThisYear).toBe(100);
});

test('OPENING_POSITION rows seed basis just like buys', () => {
  const r = realizedFromLedger([
    t({ date: `${yr - 1}-01-01`, type: 'OPENING_POSITION', shares: 10, price: 80 }),
    t({ date: `${yr}-02-01`, type: 'SELL', shares: 10, price: 90 }),
  ]);
  expect(r.realizedAllTime).toBe(100);
});

// DEC-4643 (his approval, 2026-10-12: "3,4, 8-approved"). A linked broker sends about two years of activity, so a sale
// can be bigger than the purchases on record: bought 10 @ $50, sold 15 @ $70. The sale is counted ONCE.
describe('a sale bigger than the purchases on record (DEC-4643)', () => {
  const { saleShortOfPurchasesSentence } = require('./realized');
  const sale = [t({ date: `${yr}-01-05`, shares: 10, price: 50 }), t({ date: `${yr}-06-01`, type: 'SELL', shares: 15, price: 70 })];
  test('one sale, a $200 gain on the 10 matched shares, the other 5 named', () => {
    const r = realizedFromLedger(sale);
    expect([r.realizedAllTime, r.sellsCounted, r.sellsWithoutBasis]).toEqual([200, 1, 0]);
    expect(r.shortOfPurchases).toEqual([{ date: `${yr}-06-01`, sold: 15, matched: 10, gain: 200 }]);
    expect(saleShortOfPurchasesSentence(r.shortOfPurchases[0], { kind: 'stocks_etf' }, (n: number) => `$${n}`))
      .toBe('$200 gain on 10 of 15 shares sold; what you paid for the other 5 is not on record.');
  });
  test('a loss on the matched part says loss; contracts keep their unit', () => {
    const r = realizedFromLedger([t({ date: `${yr}-01-05`, shares: 2, price: 5 }), t({ date: `${yr}-03-01`, type: 'SELL', shares: 3, price: 4 })],
      { holding: { kind: 'options' } });
    expect(r.shortOfPurchases[0]).toEqual({ date: `${yr}-03-01`, sold: 3, matched: 2, gain: -200 });   // 2 × ($4 − $5) × 100
    expect(saleShortOfPurchasesSentence(r.shortOfPurchases[0], { kind: 'options' }, (n: number) => `$${n}`))
      .toBe('$200 loss on 2 of 3 contracts sold; what you paid for the other 1 is not on record.');
  });
  test('a sale with no purchase on record at all: counted once, no gain', () => {
    const r = realizedFromLedger([t({ type: 'SELL', shares: 5, price: 300 })]);
    expect([r.sellsCounted, r.sellsWithoutBasis, r.shortOfPurchases.length]).toEqual([0, 1, 1]);
    expect(saleShortOfPurchasesSentence(r.shortOfPurchases[0], { kind: 'stocks_etf' }, (n: number) => `$${n}`))
      .toBe('5 shares sold; what you paid for them is not on record, so no gain is counted.');
  });
});
